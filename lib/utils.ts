export function formatPrice(price: number, currency = "ETB"): string {
  return `${Number(price).toLocaleString("en-US")} ${currency}`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getCustomerDisplayName(user: {
  first_name?: string;
  last_name?: string;
}): string {
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || "Telegram User";
}

/** Small helper to keep API route error responses consistent and safe. */
export function apiError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function parseTelegramLink(input: string): { chatId: string; threadId?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { chatId: "" };

  const privateMatch = trimmed.match(/t\.me\/c\/(\d+)(?:\/(\d+))?/);
  if (privateMatch) {
    const rawId = privateMatch[1];
    const chatId = rawId.startsWith("-100") ? rawId : `-100${rawId}`;
    const threadId = privateMatch[2];
    return { chatId, threadId };
  }

  const publicMatch = trimmed.match(/t\.me\/([a-zA-Z0-9_]+)(?:\/(\d+))?/);
  if (publicMatch && !["c", "share", "addstickers", "s"].includes(publicMatch[1])) {
    return { chatId: `@${publicMatch[1]}` };
  }

  if (/^[a-zA-Z0-9_]{5,32}$/.test(trimmed)) {
    return { chatId: `@${trimmed}` };
  }

  return { chatId: trimmed };
}
