import { getSupabaseAdmin } from "@/lib/supabase";
import { editTelegramMessageText, answerCallbackQuery, setTelegramChatMenuButton, sendTelegramMessage } from "@/lib/telegramBot";
import { reduceInventoryForCompletedOrder, restoreInventoryForReversedOrder } from "@/lib/inventoryService";
import { notifyCustomerOfOrderStatus } from "@/lib/orderNotification";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from: { id: number; first_name?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: {
      message_id: number;
      chat: { id: number };
      text?: string;
    };
  };
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  req_complete: "Completed",
  req_sold: "Sold",
  req_unavailable: "Unavailable",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  order_confirm: "Confirmed",
  order_complete: "Completed",
  order_cancel: "Cancelled",
};

const SELL_REQUEST_STATUS_LABELS: Record<string, string> = {
  sell_review: "Under Review",
};

/**
 * Single Telegram webhook endpoint (no polling). Verifies the
 * secret token Telegram echoes back on every request, then
 * dispatches `/start` commands and admin inline-button actions.
 */
export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expectedSecret || secretHeader !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return new Response("OK", { status: 200 });
  }

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error) {
    console.error("Telegram webhook handling failed:", error);
  }

  // Telegram only cares about a 2xx response; always return one so
  // it doesn't retry-storm us over a downstream error.
  return new Response("OK", { status: 200 });
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const text = message.text?.trim() ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const isAdmin = String(message.from.id) === process.env.ADMIN_TELEGRAM_ID;
  const name = message.from.first_name ? `, ${message.from.first_name}` : "";

  if (text.startsWith("/start")) {
    const payload = text.slice("/start".length).trim();
    let storeUrl = appUrl;
    let isProductDeepLink = false;
    let productName = "";

    if (payload.startsWith("product_")) {
      const productId = payload.replace("product_", "");
      storeUrl = `${appUrl}/products/${productId}`;
      isProductDeepLink = true;

      try {
        const supabase = getSupabaseAdmin();
        const { data: p } = await supabase
          .from("products")
          .select("name")
          .eq("id", productId)
          .single();
        if (p?.name) productName = p.name;
      } catch {}
    }

    const mainButtonText = isProductDeepLink
      ? `🛍 View ${productName || "Product"}`
      : "🛒 Open Store";

    const row = [{ text: mainButtonText, web_app: { url: storeUrl } }];
    if (isAdmin) {
      row.push({ text: "🏬 My Store", web_app: { url: `${appUrl}/admin` } });
    }

    await setTelegramChatMenuButton(
      { type: "web_app", text: "Shop Now", web_app: { url: appUrl } },
      message.chat.id
    ).catch(() => {});
    await setTelegramChatMenuButton({
      type: "web_app",
      text: "Shop Now",
      web_app: { url: appUrl },
    }).catch(() => {});

    const welcomeMessage = isProductDeepLink
      ? `📱 Tap below to view <b>${escapeHtml(productName || "product details")}</b> in the Habentech Mini App:`
      : `👋 Welcome${name}! Browse the latest electronics or manage your store below.`;

    await sendTelegramMessageWithWebApp(message.chat.id, welcomeMessage, [row]);
    return;
  }

  if (text.startsWith("/store")) {
    await sendTelegramMessageWithWebApp(message.chat.id, "🛒 Tap below to browse the store.", [
      [{ text: "🛒 Open Store", web_app: { url: appUrl } }],
    ]);
    return;
  }

  if (text.startsWith("/mystore")) {
    if (!isAdmin) return;
    await sendTelegramMessageWithWebApp(message.chat.id, "🏬 Tap below to manage your store.", [
      [{ text: "🏬 My Store", web_app: { url: `${appUrl}/admin` } }],
    ]);
    return;
  }
}

async function sendTelegramMessageWithWebApp(
  chatId: number,
  text: string,
  buttons: Array<Array<{ text: string; web_app: { url: string } }>>
) {
  // Uses fetch directly since sendTelegramMessage's InlineKeyboardButton
  // type only models `url`/`callback_data`, not `web_app`.
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: { inline_keyboard: buttons },
    }),
  });
}

async function handleCallbackQuery(
  callbackQuery: NonNullable<TelegramUpdate["callback_query"]>
) {
  const isAdmin = String(callbackQuery.from.id) === process.env.ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    await answerCallbackQuery(callbackQuery.id, "Only the store admin can do this.");
    return;
  }

  const data = callbackQuery.data ?? "";
  const [action, id] = data.split(":");
  if (!action || !id) {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  const supabase = getSupabaseAdmin();

  if (action in REQUEST_STATUS_LABELS) {
    const status = REQUEST_STATUS_LABELS[action];
    await supabase.from("product_requests").update({ status }).eq("id", id);
    await notifyCustomerOfRequestStatus(id, status);
    await answerCallbackQuery(callbackQuery.id, `Request marked as ${status}.`);
    await clearMessageKeyboard(callbackQuery, `✅ Status updated: ${status}`);
    return;
  }

  if (action in ORDER_STATUS_LABELS) {
    const nextStatus = ORDER_STATUS_LABELS[action];

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, status, product_id, quantity")
      .eq("id", id)
      .single();

    await supabase.from("orders").update({ status: nextStatus }).eq("id", id);

    if (existingOrder) {
      const previousStatus = existingOrder.status;
      const adminId = String(callbackQuery.from.id);
      if (previousStatus !== "Completed" && nextStatus === "Completed") {
        await reduceInventoryForCompletedOrder(id, existingOrder.product_id, existingOrder.quantity, adminId);
      } else if (previousStatus === "Completed" && nextStatus !== "Completed") {
        await restoreInventoryForReversedOrder(id, existingOrder.product_id, existingOrder.quantity, adminId);
      }
    }

    await notifyCustomerOfOrderStatus(id, nextStatus);

    await answerCallbackQuery(callbackQuery.id, `Order marked as ${nextStatus}.`);
    await clearMessageKeyboard(callbackQuery, `✅ Status updated: ${nextStatus}`);
    return;
  }

  if (action in SELL_REQUEST_STATUS_LABELS) {
    const status = SELL_REQUEST_STATUS_LABELS[action];
    await supabase.from("sell_requests").update({ status }).eq("id", id);
    await answerCallbackQuery(callbackQuery.id, `Sell request marked as ${status}.`);
    await clearMessageKeyboard(callbackQuery, `✅ Status updated: ${status}`);
    return;
  }

  await answerCallbackQuery(callbackQuery.id);
}

async function notifyCustomerOfRequestStatus(requestId: string, status: string) {
  const supabase = getSupabaseAdmin();

  const { data: request } = await supabase
    .from("product_requests")
    .select("telegram_user_id, customer_name, product:products(name)")
    .eq("id", requestId)
    .single();

  if (!request?.telegram_user_id) return;

  const productArr = request.product as unknown as Array<{ name: string }> | { name: string } | null;
  const productName = Array.isArray(productArr) ? productArr[0]?.name : productArr?.name;
  const productLabel = productName?.trim() || "your requested product";
  const customerName = request.customer_name?.trim() || "there";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const openStore = appUrl
    ? `\n\n🛒 Tap "Shop Now" in the menu, or send /store to keep browsing.`
    : "";

  let message: string;
  switch (status) {
    case "Sold":
      message = `📦 Hey ${customerName}, great news!\n\nThe product you requested — <b>${productLabel}</b> — is now available as <b>sold</b> and we'd love to hand it over to you. We'll be in touch to arrange delivery.${openStore}`;
      break;
    case "Completed":
      message = `✅ Hi ${customerName}!\n\nYour request for <b>${productLabel}</b> has been marked as <b>completed</b>. We'll contact you shortly with the next steps.${openStore}`;
      break;
    case "Unavailable":
      message = `🚫 Hi ${customerName}, we're sorry.\n\n<b>${productLabel}</b> is currently <b>unavailable</b>. Please check back later, or browse other products we have in stock.${openStore}`;
      break;
    default:
      message = `ℹ️ Hi ${customerName}, your request for <b>${productLabel}</b> is now <b>${status}</b>.${openStore}`;
  }

  try {
    await sendTelegramMessage(Number(request.telegram_user_id), message);
  } catch (error) {
    console.error("Failed to notify customer of request status:", error);
  }
}

async function clearMessageKeyboard(
  callbackQuery: NonNullable<TelegramUpdate["callback_query"]>,
  statusLine: string
) {
  const message = callbackQuery.message;
  if (!message) return;

  const updatedText = `${message.text ?? ""}\n\n${statusLine}`;
  try {
    await editTelegramMessageText(message.chat.id, message.message_id, updatedText, {
      replyMarkup: { inline_keyboard: [] },
    });
  } catch (error) {
    console.error("Failed to update Telegram message after callback:", error);
  }
}
