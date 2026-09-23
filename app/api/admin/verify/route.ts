import { verifyTelegramInitData, extractInitData, isPlatformAdmin } from "@/lib/telegramAuth";
import { getTenantsByOwner } from "@/lib/tenant";
import { apiError, apiSuccess } from "@/lib/utils";

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {}

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  let verified = verifyTelegramInitData(initData);

  // Allow dev fallback in development
  if (!verified && process.env.NODE_ENV === "development") {
    verified = {
      user: { id: Number(process.env.ADMIN_TELEGRAM_ID || 1084144032), first_name: "Dev Admin" },
      authDate: Math.floor(Date.now() / 1000),
    };
  }

  if (!verified) {
    return apiError("Unauthorized", 401);
  }

  const userId = String(verified.user.id);
  const isSuper = await isPlatformAdmin(userId);
  const stores = await getTenantsByOwner(userId);

  return apiSuccess({
    isAdmin: true,
    isSuperAdmin: isSuper,
    storeCount: stores.length,
    user: verified.user,
  });
}