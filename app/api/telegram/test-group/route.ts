import { verifyAdminInitData, extractInitData } from "@/lib/telegramAuth";
import { getTelegramChat } from "@/lib/telegramBot";
import { apiError, apiSuccess, parseTelegramLink } from "@/lib/utils";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid request body.", 400);
  }

  const initData = extractInitData(request, typeof body.init_data === "string" ? body.init_data : null);
  if (!verifyAdminInitData(initData)) {
    return apiError("Unauthorized", 401);
  }

  const rawInput = typeof body.chat_id === "string" ? body.chat_id.trim() : "";
  const parsed = parseTelegramLink(rawInput);
  const chatId = parsed.chatId;

  if (!chatId) {
    return apiError("Group Chat ID is required.", 400);
  }

  try {
    const chat = await getTelegramChat(chatId);

    if (chat.type !== "group" && chat.type !== "supergroup") {
      return apiError(`The specified ID belongs to a ${chat.type}, not a Telegram Group or Supergroup.`, 400);
    }

    return apiSuccess({
      success: true,
      chat: {
        id: chat.id,
        title: chat.title ?? "Telegram Group",
        type: chat.type,
        is_forum: Boolean(chat.is_forum),
      },
    });
  } catch (error) {
    console.error("POST /api/telegram/test-group failed:", error);
    const message = error instanceof Error ? error.message : "Failed to verify Telegram group.";
    return apiError(`Telegram group verification failed: ${message}. Make sure the bot is added to the group.`, 400);
  }
}
