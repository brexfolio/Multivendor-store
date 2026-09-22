import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, extractInitData } from "@/lib/telegramAuth";
import { initDataOnlySchema, formatZodError } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { apiError, apiSuccess, formatPrice } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body optional — init_data may arrive via header only
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = initDataOnlySchema.safeParse({ init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const verified = verifyTelegramInitData(parsed.data.init_data);
  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: sellRequest, error: fetchError } = await supabase
      .from("sell_requests")
      .select("id, telegram_user_id, brand, model, product_name, status, customer_name")
      .eq("id", id)
      .single();

    if (fetchError || !sellRequest) {
      return apiError("Sell request not found.", 404);
    }

    if (sellRequest.telegram_user_id !== String(verified.user.id)) {
      return apiError("Sell request not found.", 404);
    }

    if (sellRequest.status !== "Offer Sent") {
      return apiError("This request does not have an active offer to reject.", 409);
    }

    const { data: offer, error: offerFetchError } = await supabase
      .from("sell_offers")
      .select("*")
      .eq("sell_request_id", id)
      .eq("status", "Pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (offerFetchError || !offer) {
      return apiError("No pending offer found for this request.", 404);
    }

    await supabase.from("sell_offers").update({ status: "Rejected" }).eq("id", offer.id);

    const { data: updatedRequest, error: updateError } = await supabase
      .from("sell_requests")
      .update({ status: "Rejected" })
      .eq("id", id)
      .select("*, specifications:sell_request_specifications(*), images:sell_request_images(*), offers:sell_offers(*)")
      .single();

    if (updateError || !updatedRequest) throw updateError ?? new Error("Status update failed.");

    await notifyAdmin({
      deviceName: sellRequest.product_name || `${sellRequest.brand} ${sellRequest.model}`,
      customerName: sellRequest.customer_name,
      offerPrice: offer.offer_price,
      currency: offer.currency,
    });

    return apiSuccess({ sellRequest: updatedRequest });
  } catch (error) {
    console.error(`POST /api/sell-requests/${id}/reject-offer failed:`, error);
    return apiError("Unable to reject this offer right now.", 500);
  }
}

async function notifyAdmin(details: {
  deviceName: string;
  customerName: string;
  offerPrice: number;
  currency: string;
}) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;

  const message = [
    "❌ <b>Offer Rejected</b>",
    "",
    `Customer:\n${details.customerName}`,
    "",
    `Device:\n${details.deviceName}`,
    "",
    `Offer:\n${formatPrice(details.offerPrice, details.currency)}`,
  ].join("\n");

  try {
    await sendTelegramMessage(adminId, message);
  } catch (error) {
    console.error("Failed to notify admin of offer rejection:", error);
  }
}
