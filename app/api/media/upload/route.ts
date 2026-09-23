import { verifyTelegramInitData, extractInitData } from "@/lib/telegramAuth";
import { uploadImageToTelegram } from "@/lib/telegramImages";
import { isR2Configured, uploadToR2 } from "@/lib/r2Storage";
import { apiError, apiSuccess } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid multipart upload payload.", 400);
  }

  const initData = extractInitData(request, formData.get("init_data") as string | null);
  const verified = verifyTelegramInitData(initData);
  if (!verified && process.env.NODE_ENV !== "development") {
    return apiError("Unauthorized", 401);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return apiError("No media file provided.", 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return apiError("File is too large (maximum 15MB).", 400);
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";
    const filename = file.name || "media.jpg";

    // 1. Always upload to Telegram for in-app / channel posts
    const telegramResult = await uploadImageToTelegram(buffer, filename, mimeType);

    // 2. Parallel upload to Cloudflare R2 if configured
    let r2Url: string | null = null;
    let r2Key: string | null = null;
    if (isR2Configured()) {
      try {
        const r2Res = await uploadToR2(buffer, filename, mimeType);
        r2Url = r2Res.publicUrl;
        r2Key = r2Res.key;
      } catch (r2Err) {
        console.warn("Cloudflare R2 backup upload failed, continuing with Telegram CDN:", r2Err);
      }
    }

    return apiSuccess(
      {
        file_id: r2Url || telegramResult.file_id,
        telegram_file_id: telegramResult.file_id,
        file_unique_id: telegramResult.file_unique_id,
        r2_url: r2Url,
        r2_key: r2Key,
        url: r2Url || `/api/media/${encodeURIComponent(telegramResult.file_id)}`,
      },
      201
    );
  } catch (error: any) {
    console.error("Media upload failed:", error);
    return apiError(error.message || "Failed to upload media.", 500);
  }
}
