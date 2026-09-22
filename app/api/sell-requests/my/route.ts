import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, extractInitData } from "@/lib/telegramAuth";
import { apiError, apiSuccess } from "@/lib/utils";

const SELL_REQUEST_SELECT =
  "*, specifications:sell_request_specifications(*), images:sell_request_images(*), offers:sell_offers(*)";

/** Customer's own sell-device submissions, newest first. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("sell_requests")
      .select(SELL_REQUEST_SELECT)
      .eq("telegram_user_id", String(verified.user.id))
      .order("created_at", { ascending: false });

    if (error) throw error;

    return apiSuccess({ sellRequests: data ?? [] });
  } catch (error) {
    console.error("GET /api/sell-requests/my failed:", error);
    return apiError("Unable to load your sell requests right now.", 500);
  }
}
