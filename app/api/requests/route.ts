import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { requestInputSchema, formatZodError } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { apiError, apiSuccess, getCustomerDisplayName, formatPrice } from "@/lib/utils";

const REQUEST_SELECT = "*, product:products(id, name, price, currency)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));

  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  const status = searchParams.get("status");

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("product_requests").select(REQUEST_SELECT).order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ requests: data ?? [] });
  } catch (error) {
    console.error("GET /api/requests failed:", error);
    return apiError("Unable to load requests right now.", 500);
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
  const parsed = requestInputSchema.safeParse({ ...body, init_data: initData });
  if (!parsed.success) {
    return apiError(formatZodError(parsed.error), 400);
  }

  const verified = verifyTelegramInitData(parsed.data.init_data);
  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price, currency, availability")
      .eq("id", parsed.data.product_id)
      .single();

    if (productError || !product) {
      return apiError("Product not found.", 404);
    }

    if (["Sold", "Unavailable", "Out of Stock"].includes(product.availability)) {
      return apiError("This product is not currently available to request.", 409);
    }

    const customerName = getCustomerDisplayName(verified.user);

    const { data: productRequest, error: requestError } = await supabase
      .from("product_requests")
      .insert({
        product_id: product.id,
        telegram_user_id: String(verified.user.id),
        customer_name: customerName,
        username: verified.user.username ?? null,
        status: "Pending",
      })
      .select(REQUEST_SELECT)
      .single();

    if (requestError || !productRequest) throw requestError ?? new Error("Request insert failed.");

    await notifyAdminOfRequest({
      requestId: productRequest.id,
      customerName,
      username: verified.user.username ?? null,
      productName: product.name,
      price: product.price,
      currency: product.currency,
    });

    return apiSuccess({ request: productRequest }, 201);
  } catch (error) {
    console.error("POST /api/requests failed:", error);
    return apiError("Unable to send request right now.", 500);
  }
}

async function notifyAdminOfRequest(details: {
  requestId: string;
  customerName: string;
  username: string | null;
  productName: string;
  price: number;
  currency: string;
}) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;

  const message = [
    "🔥 <b>NEW PRODUCT REQUEST</b>",
    "",
    `Customer:\n${details.customerName}`,
    "",
    details.username ? `Username:\n@${details.username}` : "Username:\n(none)",
    "",
    `Product:\n${details.productName}`,
    "",
    `Price:\n${formatPrice(details.price, details.currency)}`,
  ].join("\n");

  try {
    await sendTelegramMessage(adminId, message, {
      replyMarkup: {
        inline_keyboard: [
          [
            { text: "✅ Mark Completed", callback_data: `req_complete:${details.requestId}` },
            { text: "📪 Mark Sold", callback_data: `req_sold:${details.requestId}` },
          ],
          [{ text: "🚫 Mark Unavailable", callback_data: `req_unavailable:${details.requestId}` }],
        ],
      },
    });
  } catch (error) {
    console.error("Failed to notify admin of new request:", error);
  }
}
