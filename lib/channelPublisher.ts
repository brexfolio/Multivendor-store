import type { Product } from "@/types/product";
import type { PublishTarget } from "@/types/settings";
import { getSupabaseAdmin } from "./supabase";
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
}

/**
 * Resolves Telegram settings stored in `store_settings`, including channel, group,
 * topic thread ID, and default publish target.
 */
export async function resolveStorePublishSettings(): Promise<StorePublishSettings> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("store_settings")
      .select("telegram_channel, telegram_group, telegram_group_thread_id, publish_target")
      .limit(1)
      .maybeSingle();

    const channelId = data?.telegram_channel || (process.env.TELEGRAM_CHANNEL_ID ?? null);
    const groupId = data?.telegram_group || null;
    const groupThreadId = data?.telegram_group_thread_id || null;
    const publishTarget: PublishTarget =
      data?.publish_target === "group" || data?.publish_target === "both"
        ? data.publish_target
        : "channel";

    return { channelId, groupId, groupThreadId, publishTarget };
  } catch {
    return {
      channelId: process.env.TELEGRAM_CHANNEL_ID ?? null,
      groupId: null,
      groupThreadId: null,
      publishTarget: "channel",
    };
  }
}

/**
 * Resolves which Telegram channel to publish to.
 */
export async function resolveChannelId(): Promise<string | null> {
  const settings = await resolveStorePublishSettings();
  return settings.channelId;
}

/**
 * Builds the deep link used by the "View Product" button.
 */
export function createProductLink(product: Pick<Product, "id">): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME;
  const startParam = `product_${product.id}`;

  if (botUsername && appName && appName.trim()) {
    const cleanApp = appName.trim().toLowerCase();
    return `https://t.me/${botUsername}/${cleanApp}?startapp=${startParam}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://habentech.vercel.app";
  const cleanBase = baseUrl.replace(/\/$/, "");
  return `${cleanBase}/products/${product.id}`;
}

function buildViewProductKeyboard(product: Product): { inline_keyboard: InlineKeyboardButton[][] } {
  return {
    inline_keyboard: [[{ text: "🛍 View Product", url: createProductLink(product) }]],
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Formats the HTML caption/message body used for posts.
 * Order:
 * 1. Name
 * 2. Category & Condition
 * 3. Specifications
 * 4. Description
 * 5. Price (directly above Availability)
 * 6. Availability
 */
export function formatProductMessage(product: Product): string {
  const lines: string[] = [];

  lines.push(`📱 <b>${escapeHtml(product.name)}</b>`);
  lines.push("");
  lines.push(`📂 Category: ${escapeHtml(product.category)}`);
  lines.push(`✨ Condition: ${escapeHtml(product.condition)}`);

  const specs = product.specifications ?? [];
  if (specs.length > 0) {
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
 * Publishes a product to any target chat ID (channel or group).
 */
export async function publishProductToChat(
  product: Product,
  chatId: string,
  threadId?: string | null
): Promise<ChannelPublishResult> {
  const caption = formatProductMessage(product);
  const keyboard = buildViewProductKeyboard(product);
  const images = [...(product.images ?? [])].sort((a, b) => a.display_order - b.display_order);

  try {
    if (images.length === 0) {
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

    if (images.length === 1) {
      const media = images[0].telegram_file_id || images[0].image_url;
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

    try {
      const mediaGroup = images.map((image, index) => ({
        type: "photo" as const,
        media: image.telegram_file_id || image.image_url,
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
 * Updates an existing post in a target chat ID.
 */
export async function updateChatProduct(
  product: Product,
  chatId: string,
  existingMessageId: string,
  existingMediaMessageIds: string[] | null,
  threadId?: string | null
): Promise<ChannelPublishResult> {
  const images = [...(product.images ?? [])].sort((a, b) => a.display_order - b.display_order);
  const mediaMessageIds = existingMediaMessageIds ?? [];
  const wasSinglePost = mediaMessageIds.length <= 1;
  const keyboard = buildViewProductKeyboard(product);

  try {
    if (wasSinglePost && images.length <= 1) {
      const caption = formatProductMessage(product);

      if (images.length === 1) {
        await editTelegramMessageCaption(chatId, existingMessageId, caption, {
          replyMarkup: keyboard,
        });
      } else {
        await editTelegramMessageText(chatId, existingMessageId, caption, {
          replyMarkup: keyboard,
        });
      }

      return {
        success: true,
        channelId: chatId,
        messageId: existingMessageId,
        mediaMessageIds: [existingMessageId],
      };
    }

    // Structure changed or media group: delete + repost
    await deleteChatMessages(chatId, mediaMessageIds);
    return publishProductToChat(product, chatId, threadId);
  } catch (error) {
    console.warn("Updating existing chat post failed, falling back to fresh publish:", error);
    try {
      await deleteChatMessages(chatId, mediaMessageIds);
    } catch {}
    return publishProductToChat(product, chatId, threadId);
  }
}

async function deleteChatMessages(chatId: string, messageIds: string[]): Promise<void> {
  const unique = Array.from(new Set(messageIds));
  await Promise.all(unique.map((id) => deleteTelegramMessage(chatId, id)));
}

/**
 * Publishes a product to the configured public Telegram channel.
 */
export async function publishProductToChannel(product: Product): Promise<ChannelPublishResult> {
  const channelId = await resolveChannelId();
  if (!channelId) {
    return { success: false, error: "No Telegram channel configured." };
  }
  return publishProductToChat(product, channelId);
}

/**
 * Updates an existing channel post after product was edited.
 */
export async function updateChannelProduct(product: Product): Promise<ChannelPublishResult> {
  if (!product.channel_published || !product.telegram_channel_id || !product.telegram_channel_message_id) {
    return publishProductToChannel(product);
  }
  return updateChatProduct(
    product,
    product.telegram_channel_id,
    product.telegram_channel_message_id,
    product.telegram_channel_media_message_ids ?? null
  );
}

/**
 * Publishes a product to the configured Telegram group.
 */
export async function publishProductToGroup(
  product: Product,
  groupId?: string | null,
  threadId?: string | null
): Promise<ChannelPublishResult> {
  let targetGroupId = groupId;
  let targetThreadId = threadId;

  if (!targetGroupId) {
    const settings = await resolveStorePublishSettings();
    targetGroupId = settings.groupId;
    targetThreadId = targetThreadId ?? settings.groupThreadId;
  }

  if (!targetGroupId) {
    return { success: false, error: "No Telegram group configured." };
  }

  return publishProductToChat(product, targetGroupId, targetThreadId);
}

/**
 * Updates an existing group post after product was edited.
 */
export async function updateGroupProduct(
  product: Product,
  groupId?: string | null,
  threadId?: string | null
): Promise<ChannelPublishResult> {
  const targetGroupId = product.telegram_group_id || groupId;
  const targetThreadId = product.telegram_group_thread_id || threadId;

  if (!product.group_published || !targetGroupId || !product.telegram_group_message_id) {
    return publishProductToGroup(product, targetGroupId, targetThreadId);
  }

  return updateChatProduct(
    product,
    targetGroupId,
    product.telegram_group_message_id,
    product.telegram_group_media_message_ids ?? null,
    targetThreadId
  );
}

const PRODUCT_SELECT = "*, images:product_images(*), specifications:product_specifications(*)";

/**
 * Publishes/updates product posts for Channel, Group, or Both depending on settings or product override.
 */
export async function publishProductById(
  productId: string
): Promise<{ product: Product; warning: string | null }> {
  const supabase = getSupabaseAdmin();

  const { data: rawProduct, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .single();

  if (error || !rawProduct) {
    throw new Error("Product not found.");
  }

  const product = rawProduct as Product;
  const settings = await resolveStorePublishSettings();
  const target: PublishTarget = product.publish_target || settings.publishTarget;

  const warnings: string[] = [];
  const updatePayload: Record<string, unknown> = {};

  // 1. Handle Channel Publishing
  if (target === "channel" || target === "both") {
    if (settings.channelId) {
      const channelResult = product.channel_published
        ? await updateChannelProduct(product)
        : await publishProductToChannel(product);

      if (channelResult.success) {
        updatePayload.channel_published = true;
        updatePayload.telegram_channel_id = channelResult.channelId;
        updatePayload.telegram_channel_message_id = channelResult.messageId;
        updatePayload.telegram_channel_media_message_ids = channelResult.mediaMessageIds;
        updatePayload.channel_published_at = new Date().toISOString();
      } else {
        warnings.push(`Channel: ${channelResult.error ?? "Failed to publish."}`);
      }
    } else {
      warnings.push("Channel: No Telegram channel configured.");
    }
  }

  // 2. Handle Group Publishing
  if (target === "group" || target === "both") {
    const groupId = product.telegram_group_id || settings.groupId;
    const threadId = product.telegram_group_thread_id || settings.groupThreadId;

    if (groupId) {
      const groupResult = product.group_published
        ? await updateGroupProduct(product, groupId, threadId)
        : await publishProductToGroup(product, groupId, threadId);

      if (groupResult.success) {
        updatePayload.group_published = true;
        updatePayload.telegram_group_id = groupResult.channelId;
        updatePayload.telegram_group_message_id = groupResult.messageId;
        updatePayload.telegram_group_media_message_ids = groupResult.mediaMessageIds;
        updatePayload.telegram_group_thread_id = threadId;
        updatePayload.group_published_at = new Date().toISOString();
      } else {
        warnings.push(`Group: ${groupResult.error ?? "Failed to publish."}`);
      }
    } else {
      warnings.push("Group: No Telegram group configured.");
    }
  }

  if (Object.keys(updatePayload).length > 0) {
    try {
      await supabase.from("products").update(updatePayload).eq("id", productId);
    } catch (updateError) {
      console.error("Failed to persist publish state:", updateError);
      warnings.push("Could not save publish state to database.");
    }
  }

  const { data: finalProduct } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .single();

  const warningStr = warnings.length > 0 ? warnings.join(" | ") : null;
  return { product: (finalProduct ?? product) as Product, warning: warningStr };
}

/**
 * Deletes channel post.
 */
export async function deleteChannelPost(product: Product): Promise<ChannelPublishResult> {
  if (!product.telegram_channel_id) {
    return { success: false, error: "Product was never published to a channel." };
  }

  const ids = product.telegram_channel_media_message_ids?.length
    ? product.telegram_channel_media_message_ids
    : product.telegram_channel_message_id
      ? [product.telegram_channel_message_id]
      : [];

  await deleteChatMessages(product.telegram_channel_id, ids);
  return { success: true, channelId: product.telegram_channel_id };
}

/**
 * Deletes group post.
 */
export async function deleteGroupPost(product: Product): Promise<ChannelPublishResult> {
  if (!product.telegram_group_id) {
    return { success: false, error: "Product was never published to a group." };
  }

  const ids = product.telegram_group_media_message_ids?.length
    ? product.telegram_group_media_message_ids
    : product.telegram_group_message_id
      ? [product.telegram_group_message_id]
      : [];

  await deleteChatMessages(product.telegram_group_id, ids);
  return { success: true, channelId: product.telegram_group_id };
}

/**
 * Deletes both channel and group posts if they exist.
 */
export async function deleteAllProductPosts(product: Product): Promise<void> {
  if (product.channel_published && product.telegram_channel_id) {
    await deleteChannelPost(product);
  }
  if (product.group_published && product.telegram_group_id) {
    await deleteGroupPost(product);
  }
}
