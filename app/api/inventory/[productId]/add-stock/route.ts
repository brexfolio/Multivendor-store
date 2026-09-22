import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { addStockSchema, formatZodError } from "@/lib/validation";
import { applyInventoryChange, InventoryError } from "@/lib/inventoryService";
import { getSupabaseAdmin } from "@/lib/supabase";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = addStockSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const verifiedAdmin = verifyAdminInitData(parsed.data.init_data);
  if (!verifiedAdmin) {
    return apiError("Unauthorized", 401);
  }

  try {
    const { inventory, transaction } = await applyInventoryChange({
      productId,
      transactionType: "Stock Added",
      quantityChange: parsed.data.quantity,
      reason: "Stock added",
      notes: parsed.data.notes ?? null,
      adminTelegramId: String(verifiedAdmin.user.id),
    });

    let finalInventory = inventory;
    const metaUpdate: Record<string, unknown> = {};
    if (parsed.data.cost_price !== undefined && parsed.data.cost_price !== null) {
      metaUpdate.cost_price = parsed.data.cost_price;
    }
    if (parsed.data.supplier) {
      metaUpdate.supplier = parsed.data.supplier;
    }

    if (Object.keys(metaUpdate).length > 0) {
      const { data: updated } = await getSupabaseAdmin()
        .from("inventory")
        .update(metaUpdate)
        .eq("id", inventory.id)
        .select("*")
        .single();
      if (updated) finalInventory = updated;
    }

    return apiSuccess({ inventory: finalInventory, transaction });
  } catch (error) {
    if (error instanceof InventoryError) {
      return apiError(error.message, 404);
    }
    console.error(`POST /api/inventory/${productId}/add-stock failed:`, error);
    return apiError("Unable to add stock right now.", 500);
  }
}
