import { getSupabaseAdmin } from "./supabase";
import { sendTelegramMessage } from "./telegramBot";
import type { InventoryRecord, InventoryTransaction, InventoryTransactionType } from "@/types/inventory";

export class InventoryError extends Error {}

interface ApplyChangeParams {
  productId: string;
  transactionType: InventoryTransactionType;
  /** Positive to increase stock, negative to decrease. Ignored for "Adjustment" — use `newQuantity` instead. */
  quantityChange?: number;
  /** Absolute new quantity — only used for "Adjustment" transactions. */
  newQuantity?: number;
  reason?: string | null;
  notes?: string | null;
  relatedOrderId?: string | null;
  adminTelegramId?: string | null;
  /** If true, clamps the result at 0 instead of throwing when it would go negative. */
  clampAtZero?: boolean;
}

export async function getInventoryByProduct(productId: string): Promise<InventoryRecord | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("inventory").select("*").eq("product_id", productId).maybeSingle();
  return (data as InventoryRecord) ?? null;
}

/**
 * Core inventory mutator: every quantity change — add, remove, adjust,
 * a completed sale, or a reversed one — goes through here so that a
 * transaction row is always recorded and product availability always
 * stays in sync. Uses an optimistic-concurrency update (matching on
 * the previously-read quantity) so two concurrent requests can't
 * silently clobber each other's change.
 */
export async function applyInventoryChange(
  params: ApplyChangeParams
): Promise<{ inventory: InventoryRecord; transaction: InventoryTransaction }> {
  const supabase = getSupabaseAdmin();

  const inventory = await getInventoryByProduct(params.productId);
  if (!inventory) {
    throw new InventoryError("This product does not have an inventory record yet.");
  }

  const previousQuantity = inventory.quantity;
  let computedQuantity: number;

  if (params.transactionType === "Adjustment") {
    if (params.newQuantity === undefined) {
      throw new InventoryError("newQuantity is required for an adjustment.");
    }
    computedQuantity = params.newQuantity;
  } else {
    const change = params.quantityChange ?? 0;
    computedQuantity = previousQuantity + change;
  }

  if (computedQuantity < 0) {
    if (params.clampAtZero) {
      computedQuantity = 0;
    } else {
      throw new InventoryError("Cannot remove more stock than is currently available.");
    }
  }

  const quantityChange = computedQuantity - previousQuantity;

  const { data: updatedInventory, error: updateError } = await supabase
    .from("inventory")
    .update({ quantity: computedQuantity })
    .eq("id", inventory.id)
    .eq("quantity", previousQuantity)
    .select("*")
    .single();

  if (updateError || !updatedInventory) {
    throw new InventoryError("Inventory was modified concurrently — please try again.");
  }

  const { data: transaction, error: transactionError } = await supabase
    .from("inventory_transactions")
    .insert({
      inventory_id: inventory.id,
      product_id: params.productId,
      transaction_type: params.transactionType,
      quantity_change: quantityChange,
      previous_quantity: previousQuantity,
      new_quantity: computedQuantity,
      reason: params.reason ?? null,
      notes: params.notes ?? null,
      related_order_id: params.relatedOrderId ?? null,
      admin_telegram_id: params.adminTelegramId ?? null,
    })
    .select("*")
    .single();

  if (transactionError || !transaction) {
    throw new InventoryError("Unable to record the inventory transaction.");
  }

  await syncProductAvailability(params.productId, computedQuantity, updatedInventory.minimum_stock_level);

  return { inventory: updatedInventory as InventoryRecord, transaction: transaction as InventoryTransaction };
}

/**
 * Keeps `products.availability` in sync with stock levels. Skips
 * products the admin explicitly marked "Unavailable" (that's a
 * deliberate hide, independent of stock) so inventory sync never
 * fights a manual override. Fires a one-time low-stock Telegram
 * alert only when *entering* the low-stock state, never on every
 * subsequent change while it stays low.
 */
async function syncProductAvailability(productId: string, quantity: number, minimumStockLevel: number) {
  const supabase = getSupabaseAdmin();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, availability")
    .eq("id", productId)
    .single();

  if (!product || product.availability === "Unavailable") return;

  const target = quantity <= 0 ? "Out of Stock" : quantity <= minimumStockLevel ? "Low Stock" : "Available";

  if (target === product.availability) return;

  await supabase.from("products").update({ availability: target }).eq("id", productId);

  if (target === "Low Stock" && product.availability !== "Low Stock") {
    await notifyLowStock(product.name, quantity, minimumStockLevel);
  }
}

async function notifyLowStock(productName: string, quantity: number, minimumStockLevel: number) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;

  const message = [
    "⚠️ <b>Low Stock Alert</b>",
    "",
    `Product:\n${productName}`,
    "",
    `Current Stock:\n${quantity}`,
    "",
    `Minimum Stock Level:\n${minimumStockLevel}`,
  ].join("\n");

  try {
    await sendTelegramMessage(adminId, message);
  } catch (error) {
    console.error("Failed to send low stock alert:", error);
  }
}

/**
 * Marks a product "Sold" when it has no inventory record — e.g. a
 * one-off used item that was never set up in Inventory. Respects the
 * same manual-override rule as `syncProductAvailability`: a product
 * the admin explicitly set to "Unavailable" is left alone.
 */
async function markUntrackedProductSold(productId: string) {
  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase
    .from("products")
    .select("id, availability")
    .eq("id", productId)
    .single();

  if (!product || product.availability === "Unavailable" || product.availability === "Sold") return;

  await supabase.from("products").update({ availability: "Sold" }).eq("id", productId);
}

/**
 * Reverses `markUntrackedProductSold` when a completed order is
 * reversed — only reverts if the product is still "Sold" (an admin
 * may have since changed it to something else deliberately).
 */
async function revertUntrackedProductSold(productId: string) {
  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase
    .from("products")
    .select("id, availability")
    .eq("id", productId)
    .single();

  if (!product || product.availability !== "Sold") return;

  await supabase.from("products").update({ availability: "Available" }).eq("id", productId);
}

/**
 * Reduces stock for a completed order — idempotent: if a "Sale"
 * transaction already exists for this order (e.g. the admin PATCHes
 * the same order to "Completed" twice), it does nothing the second
 * time. If the product has no inventory record (inventory tracking
 * is opt-in per product), it's marked "Sold" directly instead of
 * silently leaving it "Available" forever.
 */
export async function reduceInventoryForCompletedOrder(
  orderId: string,
  productId: string,
  quantity: number,
  adminTelegramId: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const inventory = await getInventoryByProduct(productId);
  if (!inventory) {
    await markUntrackedProductSold(productId);
    return;
  }

  const { data: existing } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("transaction_type", "Sale")
    .maybeSingle();
  if (existing) return;

  try {
    await applyInventoryChange({
      productId,
      transactionType: "Sale",
      quantityChange: -quantity,
      reason: "Order completed",
      relatedOrderId: orderId,
      adminTelegramId,
      clampAtZero: true,
    });
  } catch (error) {
    console.error(`Failed to reduce inventory for completed order ${orderId}:`, error);
  }
}

/**
 * Restores stock when a previously-completed order is reversed
 * (status changed away from "Completed"). Idempotent in the other
 * direction: only restores if a "Sale" transaction exists for this
 * order AND no "Return" has already reversed it.
 */
export async function restoreInventoryForReversedOrder(
  orderId: string,
  productId: string,
  quantity: number,
  adminTelegramId: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const inventory = await getInventoryByProduct(productId);
  if (!inventory) {
    await revertUntrackedProductSold(productId);
    return;
  }

  const { data: saleTransaction } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("transaction_type", "Sale")
    .maybeSingle();
  if (!saleTransaction) return;

  const { data: existingReturn } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("transaction_type", "Return")
    .maybeSingle();
  if (existingReturn) return;

  try {
    await applyInventoryChange({
      productId,
      transactionType: "Return",
      quantityChange: quantity,
      reason: "Order reversed",
      relatedOrderId: orderId,
      adminTelegramId,
    });
  } catch (error) {
    console.error(`Failed to restore inventory for reversed order ${orderId}:`, error);
  }
}
