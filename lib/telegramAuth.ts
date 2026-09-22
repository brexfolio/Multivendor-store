import { createHmac } from "crypto";
import type { TelegramUser } from "./telegram";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60; // 24 hours

export interface VerifiedInitData {
  user: TelegramUser;
  authDate: number;
}

/**
 * Verifies a Telegram Mini App `initData` string server-side.
 *
 * Follows the algorithm described at
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns the verified user on success, or `null` if the data is
 * missing, malformed, expired, or fails the HMAC check. Callers
 * must never trust client-supplied user info without calling this.
 */
export function verifyTelegramInitData(initData: string): VerifiedInitData | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) return null;

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;

  const dataCheckEntries: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    dataCheckEntries.push(`${key}=${value}`);
  });
  dataCheckEntries.sort();
  const dataCheckString = dataCheckEntries.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number(authDateRaw) : 0;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!authDate || nowSeconds - authDate > MAX_INIT_DATA_AGE_SECONDS) {
    return null;
  }

  const userRaw = params.get("user");
  if (!userRaw) return null;

  let user: TelegramUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }

  if (!user || typeof user.id !== "number") return null;

  return { user, authDate };
}

/**
 * Verifies initData AND checks the resulting user against
 * ADMIN_TELEGRAM_ID. Use this to gate every admin mutation route.
 */
export function verifyAdminInitData(initData: string): VerifiedInitData | null {
  if (process.env.NODE_ENV === "development" && (!initData || initData === "dev")) {
    return {
      user: { id: Number(process.env.ADMIN_TELEGRAM_ID || 1084144032), first_name: "Dev Admin" },
      authDate: Math.floor(Date.now() / 1000),
    };
  }

  const verified = verifyTelegramInitData(initData);
  if (!verified) return null;

  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId) return null;

  if (String(verified.user.id) !== String(adminId)) return null;

  return verified;
}

/**
 * Extracts initData from a request: checks the
 * `X-Telegram-Init-Data` header first, then falls back to a
 * `init_data` field in a JSON body if provided by the caller.
 */
export function extractInitData(request: Request, bodyInitData?: string | null): string {
  const headerValue = request.headers.get("x-telegram-init-data");
  if (headerValue) return headerValue;
  return bodyInitData ?? "";
}
