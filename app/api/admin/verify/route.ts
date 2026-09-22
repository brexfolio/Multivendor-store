import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { apiError, apiSuccess } from "@/lib/utils";

/**
 * Lets the Admin Dashboard frontend confirm — server-side — that
 * the current Telegram user is the configured admin before
 * rendering any admin UI or data. The frontend must never decide
 * this on its own from client-visible Telegram user info.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // fall through — initData may arrive via header only
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  const verified = verifyAdminInitData(initData);

  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  return apiSuccess({ isAdmin: true });
}
