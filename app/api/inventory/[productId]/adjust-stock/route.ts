import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { adjustStockSchema, formatZodError } from "@/lib/validation";
import { applyInventoryChange, InventoryError } from "@/lib/inventoryService";
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
  const parsed = adjustStockSchema.safeParse({ ...body, init_data: initData });
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
      transactionType: "Adjustment",
      newQuantity: parsed.data.new_quantity,
      reason: parsed.data.reason,
      notes: parsed.data.notes ?? null,
      adminTelegramId: String(verifiedAdmin.user.id),
    });

    return apiSuccess({ inventory, transaction });
  } catch (error) {
    if (error instanceof InventoryError) {
      return apiError(error.message, 409);
    }
    console.error(`POST /api/inventory/${productId}/adjust-stock failed:`, error);
    return apiError("Unable to adjust stock right now.", 500);
  }
}
