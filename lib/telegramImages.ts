const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return token;
}

/**
 * Chat used purely as Telegram-side storage for admin-uploaded
 * product photos: the bot sends the photo here to obtain a
 * permanent `file_id`, which is what gets persisted in Supabase.
 * Requires the admin to have started a conversation with the bot.
 */
function getStorageChatId(): string {
  const chatId = process.env.ADMIN_TELEGRAM_ID;
  if (!chatId) throw new Error("ADMIN_TELEGRAM_ID is not configured.");
  return chatId;
}

export interface TelegramUploadResult {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
}

/**
 * Uploads an image buffer to Telegram via the bot and returns the
 * resulting `file_id`. The bot token never leaves the server.
 */
export async function uploadImageToTelegram(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string
): Promise<TelegramUploadResult> {
  const token = getBotToken();
  const chatId = getStorageChatId();

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append(
    "photo",
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    filename
  );

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      `Telegram upload failed: ${data.description ?? "unknown error"}`
    );
  }

  const sizes = data.result.photo as Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
  }>;

  const largest = sizes[sizes.length - 1];
  return largest;
}

/**
 * Resolves a `file_id` to a short-lived direct download URL via
 * Telegram's `getFile` endpoint. Includes the bot token — must
 * only ever be used server-side (e.g. inside the image proxy
 * route), never sent to the browser.
 */
export async function getTelegramFileUrl(fileId: string): Promise<string> {
  const token = getBotToken();

  const response = await fetch(
    `${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
  );
  const data = await response.json();

  if (!data.ok) {
    throw new Error(`Telegram getFile failed: ${data.description ?? "unknown error"}`);
  }

  const filePath = data.result.file_path as string;
  return `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;
}

/**
 * Builds the internal proxy URL the frontend should use to
 * display a Telegram-hosted product image, without ever handling
 * the bot token itself.
 */
export function buildImageProxyUrl(fileId: string): string {
  return `/api/telegram/image?file_id=${encodeURIComponent(fileId)}`;
}
