import type { Product } from "@/types/product";
import type { PublishTarget } from "@/types/settings";
import { getSupabaseAdmin } from "./supabase";
import { getShopTypeConfig, FIELD_DEFINITIONS } from "./shopTypeConfig";
import {
  sendTelegramMessage,
  sendTelegramPhoto,
  sendTelegramMediaGroup,
  editTelegramMessageCaption,
  editTelegramMessageText,
  deleteTelegramMessage,
  type InlineKeyboardButton,
} from "./telegramBot";

export interface ChannelPublishResult {
  success: boolean;
  channelId?: string;
  messageId?: string;
  mediaMessageIds?: string[];
  error?: string;
}

export interface StorePublishSettings {
  channelId: string | null;
  groupId: string | null;
  groupThreadId: string | null;
  publishTarget: PublishTarget;
  slug?: string | null;
}

/**
 * Resolves Telegram publishing settings for a tenant.
 */
export async function resolveStorePublishSettings(tenantId?: string | null): Promise<StorePublishSettings> {
  const supabase = getSupabaseAdmin();

  if (tenantId) {
    try {
      const { data } = await supabase
        .from("tenants")
        .select("slug, telegram_channel, telegram_group, telegram_group_thread_id, publish_target")
        .eq("id", tenantId)
        .maybeSingle();

      if (data) {
        return {
          channelId: data.telegram_channel || null,
          groupId: data.telegram_group || null,
          groupThreadId: data.telegram_group_thread_id || null,
          publishTarget:
            data.publish_target === "group" || data.publish_target === "both"
              ? data.publish_target
              : "channel",
          slug: data.slug,
        };
      }
    } catch {}
  }

  try {
    const { data } = await supabase
      .from("store_settings")
      .select("telegram_channel, telegram_group, telegram_group_thread_id, publish_target")
      .limit(1)
      .maybeSingle();

    return {
      channelId: data?.telegram_channel || (process.env.TELEGRAM_CHANNEL_ID ?? null),
      groupId: data?.telegram_group || null,
      groupThreadId: data?.telegram_group_thread_id || null,
      publishTarget:
        data?.publish_target === "group" || data?.publish_target === "both"
          ? data.publish_target
          : "channel",
      slug: null,
    };
  } catch {
    return {
      channelId: process.env.TELEGRAM_CHANNEL_ID ?? null,
      groupId: null,
      groupThreadId: null,
      publishTarget: "channel",
      slug: null,
    };
  }
}

/**
 * Builds the deep link used by the "View Product" button.
 */
export function createProductLink(product: Pick<Product, "id" | "tenant_id">, tenantSlug?: string | null): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "MarketplaceBot";
  const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME || "app";
  const startParam = tenantSlug ? `s_${tenantSlug}_p_${product.id}` : `product_${product.id}`;

  if (botUsername && appName && appName.trim()) {
    const cleanApp = appName.trim().toLowerCase();
    return `https://t.me/${botUsername}/${cleanApp}?startapp=${startParam}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const cleanBase = baseUrl.replace(/\/$/, "");
  if (tenantSlug) {
    return `${cleanBase}/s/${tenantSlug}/products/${product.id}`;
  }
  return `${cleanBase}/products/${product.id}`;
}

function buildViewProductKeyboard(product: Product, tenantSlug?: string | null): { inline_keyboard: InlineKeyboardButton[][] } {
  return {
    inline_keyboard: [[{ text: "🛍 View in Mini App", url: createProductLink(product, tenantSlug) }]],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Formats HTML product caption dynamically based on metadata.
 */
export function formatProductMessage(product: Product, shopType?: string): string {
  const lines: string[] = [];

  const config = getShopTypeConfig(shopType);
  lines.push(`${config.icon} <b>${escapeHtml(product.name)}</b>`);
  lines.push("");
  lines.push(`📂 Category: ${escapeHtml(product.category)}`);
  if (product.condition) {
    lines.push(`✨ Condition: ${escapeHtml(product.condition)}`);
  }

  // Dynamic Metadata Fields
  if (product.metadata && typeof product.metadata === "object") {
    const metaEntries = Object.entries(product.metadata).filter(([_, v]) => v !== undefined && v !== null && v !== "");
    if (metaEntries.length > 0) {
      lines.push("");
      lines.push("📋 Details:");
      for (const [key, val] of metaEntries) {
        const fieldDef = FIELD_DEFINITIONS[key];
        const label = fieldDef?.label || key.charAt(0).toUpperCase() + key.slice(1);
        lines.push(`• ${escapeHtml(label)}: ${escapeHtml(String(val))}`);
      }
    }
  }

  // Legacy specifications fallback
  const specs = product.specifications ?? [];
  if (specs.length > 0 && (!product.metadata || Object.keys(product.metadata).length === 0)) {
    lines.push("");
    lines.push("📦 Specifications:");
    for (const spec of specs) {
      lines.push(`• ${escapeHtml(spec.label)}: ${escapeHtml(spec.value)}`);
    }
  }

  if (product.description) {
    lines.push("");
    lines.push(escapeHtml(product.description));
  }

  lines.push("");
  lines.push(`💰 Price: <b>${Number(product.price).toLocaleString()} ${product.currency}</b>`);

  const availabilityEmoji = product.availability === "Available" ? "🟢" : "🔴";
  lines.push(`${availabilityEmoji} ${escapeHtml(product.availability)}`);

  return lines.join("\n");
}

/**
 * Publishes a product to a target chat ID (channel or group).
 */
export async function publishProductToChat(
  product: Product,
  chatId: string,
  threadId?: string | null,
  tenantSlug?: string | null,
  shopType?: string
): Promise<ChannelPublishResult> {
  const caption = formatProductMessage(product, shopType);
  const keyboard = buildViewProductKeyboard(product, tenantSlug);

  // Collect image file_ids (pure Telegram CDN)
  const fileIds: string[] = product.image_file_ids && product.image_file_ids.length > 0
    ? product.image_file_ids
    : (product.images ?? []).map((img) => img.telegram_file_id || img.image_url).filter(Boolean);

  try {
    if (fileIds.length === 0) {
      const result = await sendTelegramMessage(chatId, caption, {
        replyMarkup: keyboard,
        messageThreadId: threadId ?? undefined,
      });
      return {
        success: true,
        channelId: chatId,
        messageId: String(result.message_id),
        mediaMessageIds: [String(result.message_id)],
      };
    }

    if (fileIds.length === 1) {
      const media = fileIds[0];
      try {
        const result = await sendTelegramPhoto(chatId, media, caption, {
          replyMarkup: keyboard,
          messageThreadId: threadId ?? undefined,
        });
        return {
          success: true,
          channelId: chatId,
          messageId: String(result.message_id),
          mediaMessageIds: [String(result.message_id)],
        };
      } catch (photoError) {
        console.warn("sendTelegramPhoto failed, falling back to text message:", photoError);
        const result = await sendTelegramMessage(chatId, caption, {
          replyMarkup: keyboard,
          messageThreadId: threadId ?? undefined,
        });
        return {
          success: true,
          channelId: chatId,
          messageId: String(result.message_id),
          mediaMessageIds: [String(result.message_id)],
        };
      }
    }

    // Multiple photos: use sendMediaGroup
    try {
      const mediaGroup = fileIds.map((media, index) => ({
        type: "photo" as const,
        media,
        ...(index === 0 ? { caption, parse_mode: "HTML" as const } : {}),
      }));

      const groupResults = await sendTelegramMediaGroup(chatId, mediaGroup, {
        messageThreadId: threadId ?? undefined,
      });
      const mediaMessageIds = groupResults.map((r) => String(r.message_id));

      let buttonMessageId: string | null = null;
      try {
        const buttonMessage = await sendTelegramMessage(
          chatId,
          `👉 Tap below to view <b>${escapeHtml(product.name)}</b> in the Mini App:`,
          {
            replyMarkup: keyboard,
            messageThreadId: threadId ?? undefined,
          }
        );
        buttonMessageId = String(buttonMessage.message_id);
      } catch (btnErr) {
        console.error("Failed to send follow-up button message for media group:", btnErr);
      }

      const allMessageIds = buttonMessageId ? [...mediaMessageIds, buttonMessageId] : mediaMessageIds;

      return {
        success: true,
        channelId: chatId,
        messageId: buttonMessageId ?? mediaMessageIds[0],
        mediaMessageIds: allMessageIds,
      };
    } catch (mediaGroupError) {
      console.warn("sendTelegramMediaGroup failed, falling back to text message:", mediaGroupError);
      const result = await sendTelegramMessage(chatId, caption, {
        replyMarkup: keyboard,
        messageThreadId: threadId ?? undefined,
      });
      return {
        success: true,
        channelId: chatId,
        messageId: String(result.message_id),
        mediaMessageIds: [String(result.message_id)],
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error.",
    };
  }
}

/**
 * Publishes product to tenant's configured channel and/or group.
 */
export async function publishProduct(product: Product): Promise<ChannelPublishResult> {
  const settings = await resolveStorePublishSettings(product.tenant_id);

  let targetChatId = settings.channelId;
  let targetThreadId: string | null = null;

  if (settings.publishTarget === "group" && settings.groupId) {
    targetChatId = settings.groupId;
    targetThreadId = settings.groupThreadId;
  }

  if (!targetChatId) {
    return {
      success: false,
      error: "No Telegram channel or group is configured for this store.",
    };
  }

  return publishProductToChat(product, targetChatId, targetThreadId, settings.slug);
}
export async function deleteChannelPost(channelId: string, messageId: string | number): Promise<boolean> {
  try {
    await deleteTelegramMessage(channelId, messageId);
    return true;
  } catch {
    return false;
  }
}

export const deleteGroupPost = deleteChannelPost;

export async function deleteAllProductPosts(product: Product): Promise<void> {
  const settings = await resolveStorePublishSettings(product.tenant_id);
  const tasks: Promise<unknown>[] = [];

  const chanId = product.telegram_channel_id || settings.channelId;
  const grpId = product.telegram_group_id || settings.groupId;

  if (product.telegram_channel_message_id && chanId) {
    tasks.push(deleteTelegramMessage(chanId, product.telegram_channel_message_id));
  }
  if (product.telegram_group_message_id && grpId) {
    tasks.push(deleteTelegramMessage(grpId, product.telegram_group_message_id));
  }
  if (product.telegram_channel_media_message_ids && Array.isArray(product.telegram_channel_media_message_ids) && chanId) {
    for (const mid of product.telegram_channel_media_message_ids) {
      tasks.push(deleteTelegramMessage(chanId, mid));
    }
  }
  if (product.telegram_group_media_message_ids && Array.isArray(product.telegram_group_media_message_ids) && grpId) {
    for (const mid of product.telegram_group_media_message_ids) {
      tasks.push(deleteTelegramMessage(grpId, mid));
    }
  }

  await Promise.allSettled(tasks);
}

export async function publishProductById(productId: string): Promise<{ product: Product; warning?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: product, error } = await supabase
    .from("products")
    .select("*, images:product_images(*), specifications:product_specifications(*)")
    .eq("id", productId)
    .single();

  if (error || !product) {
    throw new Error(`Product ${productId} not found.`);
  }

  const result = await publishProduct(product as Product);
  if (!result.success) {
    return { product: product as Product, warning: result.error };
  }

  const updatePayload: Record<string, unknown> = {
    channel_published: true,
    telegram_channel_id: result.channelId || null,
    telegram_channel_message_id: result.messageId ? String(result.messageId) : null,
    telegram_channel_media_message_ids: result.mediaMessageIds ?? null,
    channel_published_at: new Date().toISOString(),
  };

  await supabase.from("products").update(updatePayload).eq("id", productId);

  const { data: refetched } = await supabase
    .from("products")
    .select("*, images:product_images(*), specifications:product_specifications(*)")
    .eq("id", productId)
    .single();

  return { product: (refetched ?? product) as Product };
}
