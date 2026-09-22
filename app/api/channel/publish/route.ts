import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { publishProductById } from "@/lib/channelPublisher";
import { apiError, apiSuccess } from "@/lib/utils";

/**
 * Generic channel-publish endpoint: `{ product_id, init_data }`.
 * Equivalent to POST /api/products/{id}/publish-channel — kept as
 * a separate route so channel publishing can be triggered without
 * needing the product's ID in the URL path (e.g. from a bulk admin
 * action or an external trigger).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const productId = typeof body.product_id === "string" ? body.product_id : null;
  if (!productId) {
    return apiError("product_id is required.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  try {
    const { product, warning } = await publishProductById(productId);
    if (warning) {
      return apiError(warning, 502);
    }
    return apiSuccess({ product });
  } catch (error) {
    console.error("POST /api/channel/publish failed:", error);
    return apiError("Unable to publish to the Telegram channel right now.", 500);
  }
}
