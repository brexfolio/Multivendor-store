import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { sellOfferInputSchema, formatZodError } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { apiError, apiSuccess, formatPrice } from "@/lib/utils";

/** Admin makes a purchase offer on a submitted device. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = sellOfferInputSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  if (!verifyAdminInitData(parsed.data.init_data)) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: sellRequest, error: fetchError } = await supabase
      .from("sell_requests")
      .select("id, telegram_user_id, brand, model, product_name, currency")
      .eq("id", id)
      .single();

    if (fetchError || !sellRequest) {
      return apiError("Sell request not found.", 404);
    }

    // Superseding offers are cancelled rather than deleted, so the
    // full negotiation history stays in Supabase.
    await supabase
      .from("sell_offers")
      .update({ status: "Cancelled" })
      .eq("sell_request_id", id)
      .eq("status", "Pending");

    const { data: offer, error: offerError } = await supabase
      .from("sell_offers")
      .insert({
        sell_request_id: id,
        offer_price: parsed.data.offer_price,
        currency: sellRequest.currency,
        message: parsed.data.message || null,
        status: "Pending",
      })
      .select("*")
      .single();

    if (offerError || !offer) throw offerError ?? new Error("Offer insert failed.");

    const { data: updatedRequest, error: updateError } = await supabase
      .from("sell_requests")
      .update({ status: "Offer Sent" })
      .eq("id", id)
      .select("*, specifications:sell_request_specifications(*), images:sell_request_images(*), offers:sell_offers(*)")
      .single();

    if (updateError || !updatedRequest) throw updateError ?? new Error("Status update failed.");

    const deviceName = sellRequest.product_name || `${sellRequest.brand} ${sellRequest.model}`;
    await notifyCustomerOfOffer({
      telegramUserId: sellRequest.telegram_user_id,
      deviceName,
      offerPrice: parsed.data.offer_price,
      currency: sellRequest.currency,
      message: parsed.data.message ?? null,
    });

    return apiSuccess({ sellRequest: updatedRequest, offer });
  } catch (error) {
    console.error(`POST /api/sell-requests/${id}/offer failed:`, error);
    return apiError("Unable to send this offer right now.", 500);
  }
}

async function notifyCustomerOfOffer(details: {
  telegramUserId: string;
  deviceName: string;
  offerPrice: number;
  currency: string;
  message: string | null;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const message = [
    "💰 <b>Your device received an offer!</b>",
    "",
    `Device:\n${details.deviceName}`,
    "",
    `Store Offer:\n${formatPrice(details.offerPrice, details.currency)}`,
    "",
    details.message ? `Message:\n${details.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await sendTelegramMessage(details.telegramUserId, message, {
      replyMarkup: appUrl
        ? { inline_keyboard: [[{ text: "📱 View My Sell Requests", url: `${appUrl}/my-sell-requests` }]] }
        : undefined,
    });
  } catch (error) {
    console.error("Failed to notify customer of offer:", error);
  }
}
