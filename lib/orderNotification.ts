import { getSupabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage, sendTelegramMessageWithWebApp } from "@/lib/telegramBot";
import { formatPrice } from "@/lib/utils";
import type { Order } from "@/types/order";
import type { Tenant } from "@/types/tenant";

/**
 * Pushes customer status updates when an order status is changed.
 */
export async function notifyCustomerOfOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: order, error } = await supabase
      .from("orders")
      .select("telegram_user_id, customer_name, quantity, total_price, product:products(name, currency, tenant:tenants(name, support_telegram, slug))")
      .eq("id", orderId)
      .single();

    if (error || !order?.telegram_user_id) return;

    const productArr = order.product as unknown as Array<{
      name: string;
      currency: string;
      tenant?: { name: string; support_telegram?: string; slug: string };
    }> | {
      name: string;
      currency: string;
      tenant?: { name: string; support_telegram?: string; slug: string };
    } | null;

    const product = Array.isArray(productArr) ? productArr[0] : productArr;
    const productName = product?.name?.trim() || "your ordered item";
    const customerName = order.customer_name?.trim() || "there";
    const shopName = product?.tenant?.name || "Habentech Marketplace";
    const supportContact = product?.tenant?.support_telegram || process.env.ADMIN_TELEGRAM_ID || "support";
    const shopSlug = product?.tenant?.slug;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    let message: string;
    switch (status) {
      case "Confirmed":
        message = `✅ <b>Order Confirmed!</b>\n\nHi ${customerName}, your order for <b>${productName}</b> (Qty: ${order.quantity}) has been confirmed by <b>${shopName}</b>.\n\nWe are preparing your item now.`;
        break;
      case "Completed":
        message = `🎉 <b>Order Completed!</b>\n\nHi ${customerName}, your order for <b>${productName}</b> (Qty: ${order.quantity}) is marked as <b>completed</b>. Thank you for shopping with <b>${shopName}</b>!`;
        break;
      case "Cancelled":
        message = `❌ <b>Order Cancelled</b>\n\nHi ${customerName}, your order for <b>${productName}</b> has been <b>cancelled</b>. Please contact the vendor if you have any questions.`;
        break;
      default:
        message = `ℹ️ <b>Order Status Update</b>\n\nHi ${customerName}, your order for <b>${productName}</b> is now <b>${status}</b>.`;
    }

    const inlineButtons: Array<Array<{ text: string; web_app?: { url: string }; url?: string }>> = [];

    if (appUrl) {
      const ordersUrl = shopSlug ? `${appUrl}/s/${shopSlug}/orders` : `${appUrl}/orders`;
      inlineButtons.push([{ text: "📦 View My Orders", web_app: { url: ordersUrl } }]);
    }

    if (supportContact.startsWith("@")) {
      inlineButtons.push([{ text: `💬 Contact Shop (${supportContact})`, url: `https://t.me/${supportContact.replace("@", "")}` }]);
    }

    await sendTelegramMessageWithWebApp(Number(order.telegram_user_id), message, inlineButtons);
  } catch (error) {
    console.error("Failed to notify customer of order status:", error);
  }
}

/**
 * Pushes instant new order alerts to all owners & managers of a tenant store.
 */
export async function notifyTenantStaffOfOrder(details: {
  orderId: string;
  tenantId: string;
  customerName: string;
  customerPhone?: string | null;
  username: string | null;
  productName: string;
  quantity: number;
  totalPrice: number;
  currency: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Find all owners & managers of this store
  const { data: members } = await supabase
    .from("tenant_members")
    .select("telegram_user_id")
    .eq("tenant_id", details.tenantId)
    .in("role", ["owner", "manager"]);

  const targetTelegramIds = new Set<string>();

  if (members && members.length > 0) {
    members.forEach((m) => targetTelegramIds.add(m.telegram_user_id));
  }

  // Fallback to platform admin if no tenant staff found
  if (targetTelegramIds.size === 0 && process.env.ADMIN_TELEGRAM_ID) {
    targetTelegramIds.add(process.env.ADMIN_TELEGRAM_ID);
  }

  const message = [
    "🛒 <b>NEW CUSTOMER ORDER</b>",
    "",
    `👤 Customer: <b>${details.customerName}</b>`,
    details.customerPhone ? `📞 Phone: <code>${details.customerPhone}</code>` : null,
    details.username ? `💬 Telegram: @${details.username}` : null,
    "",
    `📦 Product: <b>${details.productName}</b>`,
    `🔢 Quantity: <b>${details.quantity}</b>`,
    `💰 Total: <b>${formatPrice(details.totalPrice, details.currency)}</b>`,
  ]
    .filter(Boolean)
    .join("\n");

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Confirm", callback_data: `order_confirm:${details.orderId}:${details.tenantId}` },
        { text: "✔️ Complete", callback_data: `order_complete:${details.orderId}:${details.tenantId}` },
      ],
      [{ text: "❌ Cancel", callback_data: `order_cancel:${details.orderId}:${details.tenantId}` }],
    ],
  };

  for (const telegramId of targetTelegramIds) {
    try {
      await sendTelegramMessage(telegramId, message, { replyMarkup });
    } catch (err) {
      console.error(`Failed to dispatch order alert to staff ${telegramId}:`, err);
    }
  }
}