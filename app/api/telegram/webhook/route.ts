import { getSupabaseAdmin } from "@/lib/supabase";
import {
  editTelegramMessageText,
  answerCallbackQuery,
  setTelegramChatMenuButton,
  sendTelegramMessage,
} from "@/lib/telegramBot";
import {
  reduceInventoryForCompletedOrder,
  restoreInventoryForReversedOrder,
} from "@/lib/inventoryService";
import { notifyCustomerOfOrderStatus } from "@/lib/orderNotification";
import { getTenantBySlug, getTenantsByOwner, isTenantMember, isPlatformAdmin } from "@/lib/tenant";

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

export async function POST(request: Request) {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
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

  return new Response("OK", { status: 200 });
}

async function handleMessage(message: NonNullable<TelegramUpdate["message"]>) {
  const text = message.text?.trim() ?? "";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const callerId = String(message.from.id);
  const name = message.from.first_name ? `, ${message.from.first_name}` : "";

  if (text.startsWith("/start")) {
    const rawPayload = text.slice("/start".length).trim();

    // 1. Check shop deep link: s_<shopSlug>_p_<productId>
    if (rawPayload.startsWith("s_") && rawPayload.includes("_p_")) {
      const match = rawPayload.match(/^s_([a-zA-Z0-9_-]+)_p_([a-fA-F0-9-]+)/);
      if (match) {
        const [, shopSlug, productId] = match;
        const tenant = await getTenantBySlug(shopSlug);
        const targetUrl = tenant
          ? `${appUrl}/s/${tenant.slug}/products/${productId}`
          : `${appUrl}/products/${productId}`;

        await sendTelegramMessageWithWebApp(message.chat.id, `📱 Tap below to view this product in <b>${escapeHtml(tenant?.name || "the store")}</b>:`, [
          [{ text: "🛍 View Product", web_app: { url: targetUrl } }],
        ]);
        return;
      }
    }

    // 2. Check vendor storefront deep link: s_<shopSlug>
    if (rawPayload.startsWith("s_")) {
      const shopSlug = rawPayload.slice(2);
      const tenant = await getTenantBySlug(shopSlug);

      if (tenant) {
        const shopUrl = `${appUrl}/s/${tenant.slug}`;
        await setTelegramChatMenuButton({
          type: "web_app",
          text: `🛍 ${tenant.name.slice(0, 16)}`,
          web_app: { url: shopUrl },
        }, message.chat.id).catch(() => {});

        const welcomeText = [
          `👋 Welcome${name}!`,
          "",
          `🏬 You are visiting <b>${escapeHtml(tenant.name)}</b>`,
          tenant.description ? escapeHtml(tenant.description) : null,
          "",
          "Tap below to browse their collection:",
        ].filter(Boolean).join("\n");

        await sendTelegramMessageWithWebApp(message.chat.id, welcomeText, [
          [{ text: `🛍 Browse ${tenant.name}`, web_app: { url: shopUrl } }],
          [{ text: "🌐 Marketplace Hub", web_app: { url: `${appUrl}/explore` } }],
        ]);
        return;
      }
    }

    // 3. Admin / Vendor portal request
    if (rawPayload === "admin") {
      await handleVendorPortalRouting(message.chat.id, callerId, appUrl);
      return;
    }

    // 4. Explore / General Start
    await setTelegramChatMenuButton({
      type: "web_app",
      text: "🛒 Explore Hub",
      web_app: { url: `${appUrl}/explore` },
    }, message.chat.id).catch(() => {});

    const welcomeMsg = [
      `👋 Welcome${name} to <b>Habentech Marketplace</b>!`,
      "",
      "Discover verified shops for Electronics, Fashion, Vehicles, Furniture, Beauty, Food & more.",
      "",
      "Tap below to start shopping or launch your own store:",
    ].join("\n");

    const buttons = [
      [{ text: "🛒 Explore Marketplace", web_app: { url: `${appUrl}/explore` } }],
      [{ text: "🏪 Vendor Portal / Launch Shop", web_app: { url: `${appUrl}/admin` } }],
    ];

    await sendTelegramMessageWithWebApp(message.chat.id, welcomeMsg, buttons);
    return;
  }

  if (text.startsWith("/mystore") || text.startsWith("/admin")) {
    await handleVendorPortalRouting(message.chat.id, callerId, appUrl);
    return;
  }

  if (text.startsWith("/explore") || text.startsWith("/store")) {
    await sendTelegramMessageWithWebApp(message.chat.id, "🛒 Tap below to explore the marketplace.", [
      [{ text: "🌐 Open Marketplace", web_app: { url: `${appUrl}/explore` } }],
    ]);
    return;
  }
}

async function handleVendorPortalRouting(chatId: number, callerId: string, appUrl: string) {
  const isSuper = await isPlatformAdmin(callerId);
  const userStores = await getTenantsByOwner(callerId);

  if (userStores.length === 0 && !isSuper) {
    const inviteText = [
      "🏪 <b>Launch Your Shop on Habentech</b>",
      "",
      "You don't have an active store yet.",
      "Start selling Electronics, Fashion, Vehicles, Furniture, or Food directly inside Telegram in 60 seconds!",
    ].join("\n");

    await sendTelegramMessageWithWebApp(chatId, inviteText, [
      [{ text: "🚀 Open Your Shop Now", web_app: { url: `${appUrl}/admin?action=onboarding` } }],
      [{ text: "🌐 Browse Marketplace", web_app: { url: `${appUrl}/explore` } }],
    ]);
    return;
  }

  if (userStores.length === 1 && !isSuper) {
    const store = userStores[0];
    await sendTelegramMessageWithWebApp(chatId, `🏬 Tap below to manage <b>${escapeHtml(store.name)}</b>:`, [
      [{ text: `⚙️ Manage ${store.name}`, web_app: { url: `${appUrl}/admin` } }],
    ]);
    return;
  }

  await sendTelegramMessageWithWebApp(chatId, "🏬 Tap below to open your Vendor Dashboard & Store Switcher:", [
    [{ text: "⚙️ Vendor Admin Dashboard", web_app: { url: `${appUrl}/admin` } }],
  ]);
}

async function sendTelegramMessageWithWebApp(
  chatId: number,
  text: string,
  buttons: Array<Array<{ text: string; web_app?: { url: string }; url?: string }>>
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    }),
  });
}

async function handleCallbackQuery(
  callbackQuery: NonNullable<TelegramUpdate["callback_query"]>
) {
  const callerId = String(callbackQuery.from.id);
  const data = callbackQuery.data ?? "";
  const parts = data.split(":");
  const [action, orderId, tenantId] = parts;

  if (!action || !orderId) {
    await answerCallbackQuery(callbackQuery.id);
    return;
  }

  // Permission verification
  if (tenantId) {
    const hasPermission = await isTenantMember(callerId, tenantId);
    if (!hasPermission) {
      await answerCallbackQuery(callbackQuery.id, "Unauthorized: You do not manage this store.");
      return;
    }
  }

  const supabase = getSupabaseAdmin();

  if (action === "order_confirm" || action === "order_complete" || action === "order_cancel") {
    const nextStatus =
      action === "order_confirm"
        ? "Confirmed"
        : action === "order_complete"
        ? "Completed"
        : "Cancelled";

    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id, status, product_id, quantity, tenant_id")
      .eq("id", orderId)
      .single();

    if (!existingOrder) {
      await answerCallbackQuery(callbackQuery.id, "Order not found.");
      return;
    }

    const previousStatus = existingOrder.status;
    await supabase.from("orders").update({ status: nextStatus }).eq("id", orderId);

    // Auto-Inventory Sync
    if (previousStatus !== "Completed" && nextStatus === "Completed") {
      await reduceInventoryForCompletedOrder(orderId, existingOrder.product_id, existingOrder.quantity, callerId, existingOrder.tenant_id);
    } else if (previousStatus === "Completed" && nextStatus !== "Completed") {
      await restoreInventoryForReversedOrder(orderId, existingOrder.product_id, existingOrder.quantity, callerId, existingOrder.tenant_id);
    }

    await notifyCustomerOfOrderStatus(orderId, nextStatus);
    await answerCallbackQuery(callbackQuery.id, `Order marked as ${nextStatus}.`);

    if (callbackQuery.message) {
      const updatedText = `${callbackQuery.message.text ?? ""}\n\n✅ Status updated: <b>${nextStatus}</b>`;
      await editTelegramMessageText(callbackQuery.message.chat.id, callbackQuery.message.message_id, updatedText, {
        replyMarkup: { inline_keyboard: [] },
      });
    }
  }
}