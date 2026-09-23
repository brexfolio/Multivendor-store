import { getSupabaseAdmin } from "./supabase";
import { sendTelegramMessage } from "./telegramBot";
import type { InventoryRecord, InventoryTransaction, InventoryTransactionType } from "@/types/inventory";

export class InventoryError extends Error {}

interface ApplyChangeParams {
  productId: string;
  transactionType: InventoryTransactionType;
  quantityChange?: number;
  newQuantity?: number;
  reason?: string | null;
  notes?: string | null;
  relatedOrderId?: string | null;
  adminTelegramId?: string | null;
  tenantId?: string | null;
  clampAtZero?: boolean;
}

export async function getInventoryByProduct(productId: string, tenantId?: string | null): Promise<InventoryRecord | null> {
  const supabase = getSupabaseAdmin();
  let query = supabase.from("inventory").select("*").eq("product_id", productId);
  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }
  const { data } = await query.maybeSingle();
  return (data as InventoryRecord) ?? null;
}

export async function applyInventoryChange(
  params: ApplyChangeParams
): Promise<{ inventory: InventoryRecord; transaction: InventoryTransaction }> {
  const supabase = getSupabaseAdmin();

  const inventory = await getInventoryByProduct(params.productId, params.tenantId);
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
  const targetTenantId = params.tenantId || inventory.tenant_id;

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
      tenant_id: targetTenantId,
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

  await syncProductAvailability(params.productId, computedQuantity, inventory.minimum_stock_level, targetTenantId);

  return { inventory: updatedInventory as InventoryRecord, transaction: transaction as InventoryTransaction };
}

async function syncProductAvailability(
  productId: string,
  newQuantity: number,
  minimumStockLevel: number,
  tenantId?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  let targetAvailability: string;
  if (newQuantity <= 0) {
    targetAvailability = "Out of Stock";
  } else if (newQuantity <= minimumStockLevel) {
    targetAvailability = "Low Stock";
  } else {
    targetAvailability = "Available";
  }

  await supabase
    .from("products")
    .update({ availability: targetAvailability })
    .eq("id", productId);

  if (targetAvailability === "Low Stock" || targetAvailability === "Out of Stock") {
    await sendLowStockAlert(productId, newQuantity, minimumStockLevel, targetAvailability, tenantId);
  }
}

async function sendLowStockAlert(
  productId: string,
  currentQuantity: number,
  minimumStockLevel: number,
  status: string,
  tenantId?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: product } = await supabase
    .from("products")
    .select("name, tenant_id, tenant:tenants(name)")
    .eq("id", productId)
    .single();

  const effectiveTenantId = tenantId || product?.tenant_id;
  const storeName = (product?.tenant as unknown as { name: string } | null)?.name || "Your store";

  // Alert all store managers & owners
  const targetIds: string[] = [];
  if (effectiveTenantId) {
    const { data: members } = await supabase
      .from("tenant_members")
      .select("telegram_user_id")
      .eq("tenant_id", effectiveTenantId)
      .in("role", ["owner", "manager"]);
    if (members) {
      members.forEach((m) => targetIds.push(m.telegram_user_id));
    }
  }

  if (targetIds.length === 0 && process.env.ADMIN_TELEGRAM_ID) {
    targetIds.push(process.env.ADMIN_TELEGRAM_ID);
  }

  const emoji = status === "Out of Stock" ? "🚨" : "⚠️";
  const message = [
    `${emoji} <b>INVENTORY ALERT — ${storeName.toUpperCase()}</b>`,
    "",
    `Product: <b>${product?.name ?? "Unknown"}</b>`,
    `Status: <b>${status}</b>`,
    `Current Stock: <b>${currentQuantity}</b>`,
    `Reorder Point: <b>${minimumStockLevel}</b>`,
  ].join("\n");

  for (const tid of targetIds) {
    try {
      await sendTelegramMessage(tid, message);
    } catch {}
  }
}

export async function reduceInventoryForCompletedOrder(
  orderId: string,
  productId: string,
  quantityToDeduct: number,
  adminTelegramId?: string | null,
  tenantId?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existingSale } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("transaction_type", "Sale")
    .maybeSingle();

  if (existingSale) return;

  await applyInventoryChange({
    productId,
    transactionType: "Sale",
    quantityChange: -Math.abs(quantityToDeduct),
    reason: "Order fulfilled",
    relatedOrderId: orderId,
    adminTelegramId,
    tenantId,
    clampAtZero: true,
  });
}

export async function restoreInventoryForReversedOrder(
  orderId: string,
  productId: string,
  quantityToRestore: number,
  adminTelegramId?: string | null,
  tenantId?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: existingReturn } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("related_order_id", orderId)
    .eq("transaction_type", "Return")
    .maybeSingle();

  if (existingReturn) return;

  await applyInventoryChange({
    productId,
    transactionType: "Return",
    quantityChange: Math.abs(quantityToRestore),
    reason: "Order cancelled / un-completed",
    relatedOrderId: orderId,
    adminTelegramId,
    tenantId,
  });
}