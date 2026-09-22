"use client";

/**
 * Thin client-side wrapper around the Telegram Mini Apps
 * `window.Telegram.WebApp` object. Never trust `initDataUnsafe`
 * for anything security-sensitive — it is only used here for
 * display purposes (e.g. greeting the user by name). All real
 * authorization happens server-side against the raw `initData`
 * string (see lib/telegramAuth.ts).
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    [key: string]: unknown;
  };
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    setText: (text: string) => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
  };
  onEvent: (eventType: string, cb: () => void) => void;
  offEvent: (eventType: string, cb: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function isTelegramEnvironment(): boolean {
  return typeof window !== "undefined" && Boolean(window.Telegram?.WebApp?.initData);
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * Initializes the Mini App: signals readiness and expands to
 * full height. Safe to call outside Telegram (no-op fallback).
 */
export function initTelegramApp(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand();
    if (typeof (webApp as unknown as { requestFullscreen?: () => void }).requestFullscreen === "function") {
      (webApp as unknown as { requestFullscreen: () => void }).requestFullscreen();
    }
  } catch {}
}

export function getTelegramUser(): TelegramUser | null {
  return getTelegramWebApp()?.initDataUnsafe?.user ?? null;
}

export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

export function getColorScheme(): "light" | "dark" {
  return getTelegramWebApp()?.colorScheme ?? "light";
}

export function hapticImpact(style: "light" | "medium" | "heavy" = "medium"): void {
  getTelegramWebApp()?.HapticFeedback?.impactOccurred(style);
}

export function hapticNotification(type: "error" | "success" | "warning"): void {
  getTelegramWebApp()?.HapticFeedback?.notificationOccurred(type);
}

export function closeMiniApp(): void {
  getTelegramWebApp()?.close();
}
