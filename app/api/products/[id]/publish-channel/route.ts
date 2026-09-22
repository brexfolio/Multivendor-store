import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { publishProductById } from "@/lib/channelPublisher";
import { apiError, apiSuccess } from "@/lib/utils";

/**
 * Manual "📢 Publish to Channel" retry for products whose automatic
 * publish failed, or "Update Channel Post" for already-published ones.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional for this endpoint.
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const { product, warning } = await publishProductById(id);
    const hasPublished = product.channel_published || product.group_published;

    if (!hasPublished && warning) {
      return apiError(warning, 502);
    }

    return apiSuccess({ product, channelWarning: warning });
  } catch (error) {
    console.error(`POST /api/products/${id}/publish-channel failed:`, error);
    return apiError("Unable to publish to Telegram right now.", 500);
  }
}
