import { verifyTelegramInitData, extractInitData } from "@/lib/telegramAuth";
import { uploadImageToTelegram } from "@/lib/telegramImages";
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

    const telegramResult = await uploadImageToTelegram(buffer, filename, mimeType);

    return apiSuccess(
      {
        file_id: telegramResult.file_id,
        file_unique_id: telegramResult.file_unique_id,
        url: `/api/media/${encodeURIComponent(telegramResult.file_id)}`,
      },
      201
    );
  } catch (error: any) {
    console.error("Media upload to Telegram failed:", error);
    return apiError(error.message || "Failed to upload media to Telegram.", 500);
  }
}
