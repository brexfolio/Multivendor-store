import { getSupabaseAdmin } from "@/lib/supabase";
import { sendTelegramMessage, sendTelegramMessageWithWebApp } from "@/lib/telegramBot";

export async function notifyCustomerOfOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: order, error } = await supabase
      .from("orders")
      .select("telegram_user_id, customer_name, quantity, total_price, product:products(name, currency)")
      .eq("id", orderId)
      .single();

    if (error || !order?.telegram_user_id) return;

    const productArr = order.product as unknown as Array<{ name: string; currency: string }> | { name: string; currency: string } | null;
    const product = Array.isArray(productArr) ? productArr[0] : productArr;
    const productName = product?.name?.trim() || "your ordered product";
    const customerName = order.customer_name?.trim() || "there";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

    let message: string;
    switch (status) {
      case "Confirmed":
        message = `✅ <b>Order Confirmed!</b>\n\nHi ${customerName}, your order for <b>${productName}</b> (Qty: ${order.quantity}) has been confirmed by Habentech. We are preparing your item now.\n\n📱 <b>Need assistance or have questions?</b>\nContact Admin: @Tech_hub4`;
        break;
      case "Completed":
        message = `🎉 <b>Order Completed!</b>\n\nHi ${customerName}, your order for <b>${productName}</b> (Qty: ${order.quantity}) is marked as <b>completed</b>. Thank you for shopping with Habentech!\n\n📱 <b>Contact Admin:</b> @Tech_hub4`;
        break;
      case "Cancelled":
        message = `❌ <b>Order Status Update</b>\n\nHi ${customerName}, your order for <b>${productName}</b> has been <b>cancelled</b>.\n\n📱 <b>Contact Admin:</b> @Tech_hub4`;
        break;
      default:
        message = `ℹ️ <b>Order Status Update</b>\n\nHi ${customerName}, your order for <b>${productName}</b> status is now <b>${status}</b>.\n\n📱 <b>Contact Admin:</b> @Tech_hub4`;
    }

    const inlineButtons: Array<Array<{ text: string; web_app?: { url: string }; url?: string }>> = [];

    if (appUrl) {
      inlineButtons.push([{ text: "📦 View My Orders", web_app: { url: `${appUrl}/orders` } }]);
    }
    inlineButtons.push([{ text: "💬 Contact Admin (@Tech_hub4)", url: "https://t.me/Tech_hub4" }]);

    await sendTelegramMessageWithWebApp(Number(order.telegram_user_id), message, inlineButtons);
  } catch (error) {
    console.error("Failed to notify customer of order status:", error);
  }
}
