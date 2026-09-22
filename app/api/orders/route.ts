import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyTelegramInitData, verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { orderInputSchema, formatZodError } from "@/lib/validation";
import { sendTelegramMessage } from "@/lib/telegramBot";
import { apiError, apiSuccess, getCustomerDisplayName, formatPrice } from "@/lib/utils";
import { getInventoryByProduct } from "@/lib/inventoryService";

const ORDER_SELECT = "*, product:products(id, name, price, currency)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const initData = extractInitData(request, searchParams.get("init_data"));
  const status = searchParams.get("status");

  const isAdmin = Boolean(verifyAdminInitData(initData));
  const verifiedUser = isAdmin ? null : verifyTelegramInitData(initData);

  if (!isAdmin && !verifiedUser) {
    return apiError("Unauthorized", 401);
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (!isAdmin && verifiedUser) {
      query = query.eq("telegram_user_id", String(verifiedUser.user.id));
    }

    const { data, error } = await query;
    if (error) throw error;

    return apiSuccess({ orders: data ?? [] });
  } catch (error) {
    console.error("GET /api/orders failed:", error);
    return apiError("Unable to load orders right now.", 500);
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
  const parsed = orderInputSchema.safeParse({ ...body, init_data: initData });
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
      return apiError("This product is not currently available to order.", 409);
    }

    const inventory = await getInventoryByProduct(product.id);
    if (inventory && parsed.data.quantity > inventory.quantity) {
      return apiError(
        inventory.quantity > 0
          ? `Only ${inventory.quantity} unit(s) of this product are in stock.`
          : "This product is out of stock.",
        409
      );
    }

    const totalPrice = Number(product.price) * parsed.data.quantity;
    const customerName = getCustomerDisplayName(verified.user);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        product_id: product.id,
        telegram_user_id: String(verified.user.id),
        customer_name: customerName,
        username: verified.user.username ?? null,
        quantity: parsed.data.quantity,
        total_price: totalPrice,
        status: "Pending",
      })
      .select(ORDER_SELECT)
      .single();

    if (orderError || !order) throw orderError ?? new Error("Order insert failed.");

    await notifyAdminOfOrder({
      orderId: order.id,
      customerName,
      username: verified.user.username ?? null,
      productName: product.name,
      quantity: parsed.data.quantity,
      totalPrice,
      currency: product.currency,
    });

    return apiSuccess({ order }, 201);
  } catch (error) {
    console.error("POST /api/orders failed:", error);
    return apiError("Unable to place order right now.", 500);
  }
}

async function notifyAdminOfOrder(details: {
  orderId: string;
  customerName: string;
  username: string | null;
  productName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
}) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return;

  const message = [
    "🛒 <b>NEW ORDER</b>",
    "",
    `Customer: ${details.customerName}`,
    details.username ? `Username: @${details.username}` : "Username: (none)",
    `Product: ${details.productName}`,
    `Quantity: ${details.quantity}`,
    `Total: ${formatPrice(details.totalPrice, details.currency)}`,
  ].join("\n");

  try {
    await sendTelegramMessage(adminId, message, {
      replyMarkup: {
        inline_keyboard: [
          [
            { text: "✅ Confirm", callback_data: `order_confirm:${details.orderId}` },
            { text: "✔️ Complete", callback_data: `order_complete:${details.orderId}` },
          ],
          [{ text: "❌ Cancel", callback_data: `order_cancel:${details.orderId}` }],
        ],
      },
    });
  } catch (error) {
    console.error("Failed to notify admin of new order:", error);
  }
}
