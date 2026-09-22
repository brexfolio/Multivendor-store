import { verifyTelegramInitData, extractInitData } from "@/lib/telegramAuth";
import { uploadImageToTelegram, buildImageProxyUrl } from "@/lib/telegramImages";
import { apiError, apiSuccess } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Customer-facing image upload for Sell Device photos. Unlike
 * /api/telegram/image (admin-only, used for product photos), this
 * accepts uploads from any verified Telegram user — but still never
 * exposes the bot token, and still forwards the file to Telegram
 * (same storage mechanism, same `file_id` reuse) via the server.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid upload payload.", 400);
  }

  const initData = extractInitData(request, formData.get("init_data") as string | null);
  if (!verifyTelegramInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("No image file provided.", 400);
  }

  if (!file.type.startsWith("image/")) {
    return apiError("Only image files are supported.", 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return apiError("Image is too large (max 10MB).", 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadImageToTelegram(buffer, file.name || "device.jpg", file.type);

    return apiSuccess(
      {
        telegram_file_id: result.file_id,
        image_url: buildImageProxyUrl(result.file_id),
      },
      201
    );
  } catch (error) {
    console.error("Sell-device image upload failed:", error);
    return apiError("Unable to upload image right now.", 502);
  }
}
