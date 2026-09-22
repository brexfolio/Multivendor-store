"use client";

import { useEffect, useState } from "react";
import {
  initTelegramApp,
  getTelegramUser,
  getColorScheme,
  getTelegramWebApp,
  isTelegramEnvironment,
  type TelegramUser,
} from "./telegram";

export function useTelegramUser() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [inTelegram, setInTelegram] = useState(false);

  useEffect(() => {
    initTelegramApp();
    setUser(getTelegramUser());
    setInTelegram(isTelegramEnvironment());
    setIsReady(true);

    const applyTheme = () => {
      const theme = getColorScheme();
      document.documentElement.setAttribute("data-tg-theme", theme);
    };

    applyTheme();

    const webApp = getTelegramWebApp();
    webApp?.onEvent("themeChanged", applyTheme);

    return () => {
      webApp?.offEvent("themeChanged", applyTheme);
    };
  }, []);

  return { user, isReady, inTelegram };
}
