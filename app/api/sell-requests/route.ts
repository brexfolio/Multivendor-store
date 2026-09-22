import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { sellRequestInputSchema, formatZodError } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { apiError, apiSuccess, getCustomerDisplayName, formatPrice } from "@/lib/utils";

const SELL_REQUEST_SELECT =
  "*, specifications:sell_request_specifications(*), images:sell_request_images(*), offers:sell_offers(*)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  const status = searchParams.get("status");

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("sell_requests")
      .select(SELL_REQUEST_SELECT)
      .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ sellRequests: data ?? [] });
  } catch (error) {
    console.error("GET /api/sell-requests failed:", error);
    return apiError("Unable to load sell requests right now.", 500);
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const parsed = sellRequestInputSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const verified = verifyTelegramInitData(parsed.data.init_data);
  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();
  const input = parsed.data;
  const customerName = getCustomerDisplayName(verified.user);

  try {
    const { data: created, error: insertError } = await supabase
      .from("sell_requests")
      .insert({
        telegram_user_id: String(verified.user.id),
        customer_name: customerName,
        telegram_username: verified.user.username ?? null,
        category: input.category,
        brand: input.brand,
        model: input.model,
        product_name: input.product_name || null,
        condition: input.condition,
        condition_description: input.condition_description,
        expected_price: input.expected_price,
        currency: input.currency,
        price_negotiable: input.price_negotiable,
        status: "Pending",
      })
      .select("id")
      .single();

    if (insertError || !created) throw insertError ?? new Error("Insert failed.");

    if (input.specifications.length > 0) {
      const { error: specsError } = await supabase.from("sell_request_specifications").insert(
        input.specifications.map((spec, index) => ({
          sell_request_id: created.id,
          label: spec.label,
          value: spec.value,
          display_order: index,
        }))
      );
      if (specsError) throw specsError;
    }

    const { error: imagesError } = await supabase.from("sell_request_images").insert(
      input.images.map((image, index) => ({
        sell_request_id: created.id,
        telegram_file_id: image.telegram_file_id ?? null,
        image_url: image.image_url,
        display_order: index,
      }))
    );
    if (imagesError) throw imagesError;

    const { data: fullRequest, error: fetchError } = await supabase
      .from("sell_requests")
      .select(SELL_REQUEST_SELECT)
      .eq("id", created.id)
      .single();

    if (fetchError || !fullRequest) throw fetchError ?? new Error("Fetch failed.");

    await notifyAdminOfSellRequest({
      requestId: created.id,
      customerName,
      username: verified.user.username ?? null,
      deviceName: input.product_name || `${input.brand} ${input.model}`,
      expectedPrice: input.expected_price,
      currency: input.currency,
    });

    return apiSuccess({ sellRequest: fullRequest }, 201);
  } catch (error) {
    console.error("POST /api/sell-requests failed:", error);
    return apiError("Unable to submit your device right now.", 500);
  }
}

async function notifyAdminOfSellRequest(details: {
  requestId: string;
  customerName: string;
  username: string | null;
  deviceName: string;
  expectedPrice: number;
  currency: string;
}) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;

  const message = [
    "📱 <b>NEW SELL DEVICE REQUEST</b>",
    "",
    `Customer:\n${details.customerName}`,
    "",
    details.username ? `Username:\n@${details.username}` : "Username:\n(none)",
    "",
    `Device:\n${details.deviceName}`,
    "",
    `Expected Price:\n${formatPrice(details.expectedPrice, details.currency)}`,
  ].join("\n");

  try {
    await sendTelegramMessage(adminId, message, {
      replyMarkup: {
        inline_keyboard: [
          [{ text: "🔍 Mark Under Review", callback_data: `sell_review:${details.requestId}` }],
        ],
      },
    });
  } catch (error) {
    console.error("Failed to notify admin of new sell request:", error);
  }
}
