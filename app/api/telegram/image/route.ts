import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { uploadImageToTelegram, getTelegramFileUrl, buildImageProxyUrl } from "@/lib/telegramImages";
import { apiError, apiSuccess } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // Telegram's own photo upload limit.

/**
 * Admin-only image upload: forwards the file to Telegram to obtain
 * a permanent `file_id`, and returns a proxy URL the frontend can
 * use to display it. The bot token never reaches the browser.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid upload payload.", 400);
  }

  const initData = extractInitData(request, formData.get("init_data") as string | null);
  if (!verifyAdminInitData(initData)) {
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
    const result = await uploadImageToTelegram(buffer, file.name || "product.jpg", file.type);

    return apiSuccess(
      {
        telegram_file_id: result.file_id,
        image_url: buildImageProxyUrl(result.file_id),
      },
      201
    );
  } catch (error) {
    console.error("Telegram image upload failed:", error);
    return apiError("Unable to upload image right now.", 502);
  }
}

/**
 * Public proxy for displaying a Telegram-hosted image by `file_id`
 * without exposing the bot token to the client.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file_id");

  if (!fileId) {
    return apiError("Missing file_id.", 400);
  }

  try {
    const fileUrl = await getTelegramFileUrl(fileId);
    const response = await fetch(fileUrl);

    if (!response.ok || !response.body) {
      return apiError("Image not found.", 404);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Telegram image proxy failed:", error);
    return apiError("Unable to load image right now.", 502);
  }
}
