import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { orderStatusSchema, formatZodError } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/utils";
import { reduceInventoryForCompletedOrder, restoreInventoryForReversedOrder } from "@/lib/inventoryService";
import { notifyCustomerOfOrderStatus } from "@/lib/orderNotification";

const ORDER_SELECT = "*, product:products(id, name, price, currency)";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = orderStatusSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const verifiedAdmin = verifyAdminInitData(parsed.data.init_data);
  if (!verifiedAdmin) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("id, status, product_id, quantity")
      .eq("id", id)
      .single();

    if (fetchError || !existingOrder) {
      return apiError("Order not found.", 404);
    }

    const previousStatus = existingOrder.status;
    const nextStatus = parsed.data.status;

    const { data, error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", id)
      .select(ORDER_SELECT)
      .single();

    if (error || !data) {
      return apiError("Order not found.", 404);
    }

    // Stock only moves when an order actually crosses into/out of
    // "Completed" — never just because it was created or touched.
    if (previousStatus !== "Completed" && nextStatus === "Completed") {
      await reduceInventoryForCompletedOrder(
        id,
        existingOrder.product_id,
        existingOrder.quantity,
        String(verifiedAdmin.user.id)
      );
    } else if (previousStatus === "Completed" && nextStatus !== "Completed") {
      await restoreInventoryForReversedOrder(
        id,
        existingOrder.product_id,
        existingOrder.quantity,
        String(verifiedAdmin.user.id)
      );
    }

    if (previousStatus !== nextStatus) {
      await notifyCustomerOfOrderStatus(id, nextStatus);
    }

    return apiSuccess({ order: data });
  } catch (error) {
    console.error(`PATCH /api/orders/${id} failed:`, error);
    return apiError("Unable to update order right now.", 500);
  }
}
