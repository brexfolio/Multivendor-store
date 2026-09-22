import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { requestStatusSchema, formatZodError } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/utils";

const REQUEST_SELECT = "*, product:products(id, name, price, currency)";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = requestStatusSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  if (!verifyAdminInitData(parsed.data.init_data)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("product_requests")
      .update({ status: parsed.data.status })
      .eq("id", id)
      .select(REQUEST_SELECT)
      .single();

    if (error || !data) {
      return apiError("Request not found.", 404);
    }

    return apiSuccess({ request: data });
  } catch (error) {
    console.error(`PATCH /api/requests/${id} failed:`, error);
    return apiError("Unable to update request right now.", 500);
  }
}
