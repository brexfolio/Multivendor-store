import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { sellRequestUpdateSchema, formatZodError } from "@/lib/validation";
import { apiError, apiSuccess } from "@/lib/utils";

const SELL_REQUEST_SELECT =
  "*, specifications:sell_request_specifications(*), images:sell_request_images(*), offers:sell_offers(*)";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  const isAdmin = Boolean(verifyAdminInitData(initData));
  const verifiedUser = isAdmin ? null : verifyTelegramInitData(initData);

  if (!isAdmin && !verifiedUser) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sell_requests")
      .select(SELL_REQUEST_SELECT)
      .eq("id", id)
      .single();

    if (error || !data) {
      return apiError("Sell request not found.", 404);
    }

    if (!isAdmin && verifiedUser && data.telegram_user_id !== String(verifiedUser.user.id)) {
      return apiError("Sell request not found.", 404);
    }

    return apiSuccess({ sellRequest: data });
  } catch (error) {
    console.error(`GET /api/sell-requests/${id} failed:`, error);
    return apiError("Unable to load this sell request right now.", 500);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = sellRequestUpdateSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  if (!verifyAdminInitData(parsed.data.init_data)) {
    return apiError("Unauthorized", 401);
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) updatePayload.status = parsed.data.status;
  if (parsed.data.admin_notes !== undefined) updatePayload.admin_notes = parsed.data.admin_notes;

  if (Object.keys(updatePayload).length === 0) {
    return apiError("Nothing to update.", 400);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sell_requests")
      .update(updatePayload)
      .eq("id", id)
      .select(SELL_REQUEST_SELECT)
      .single();

    if (error || !data) {
      return apiError("Sell request not found.", 404);
    }

    return apiSuccess({ sellRequest: data });
  } catch (error) {
    console.error(`PATCH /api/sell-requests/${id} failed:`, error);
    return apiError("Unable to update this sell request right now.", 500);
  }
}
