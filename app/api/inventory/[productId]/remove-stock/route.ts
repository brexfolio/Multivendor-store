import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { removeStockSchema, formatZodError } from "@/lib/validation";
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
  const parsed = removeStockSchema.safeParse({ ...body, init_data: initData });
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
      transactionType: "Stock Removed",
      quantityChange: -parsed.data.quantity,
      reason: parsed.data.reason,
      notes: parsed.data.notes ?? null,
      adminTelegramId: String(verifiedAdmin.user.id),
      clampAtZero: false,
    });

    return apiSuccess({ inventory, transaction });
  } catch (error) {
    if (error instanceof InventoryError) {
      return apiError(error.message, 409);
    }
    console.error(`POST /api/inventory/${productId}/remove-stock failed:`, error);
    return apiError("Unable to remove stock right now.", 500);
  }
}
