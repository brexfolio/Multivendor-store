"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function extractProductId(): string | null {
  if (typeof window === "undefined") return null;

  // 1. Telegram WebApp object
  try {
    const webApp = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string }; initData?: string } } }).Telegram?.WebApp;
    if (webApp?.initDataUnsafe?.start_param) {
      const sp = String(webApp.initDataUnsafe.start_param).trim();
      if (sp.startsWith("product_")) return sp.replace("product_", "");
      if (sp) return sp;
    }
  } catch {}

  // 2. Scan all possible raw and decoded URL locations (href, search, hash, initData, referrer)
  const sourcesToScan: string[] = [];

  try { sourcesToScan.push(window.location.href); } catch {}
  try { sourcesToScan.push(window.location.search); } catch {}
  try { sourcesToScan.push(window.location.hash); } catch {}

  try {
    const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData;
    if (initData) sourcesToScan.push(initData);
  } catch {}

  try {
    if (document.referrer) sourcesToScan.push(document.referrer);
  } catch {}

  for (const rawSource of sourcesToScan) {
    if (!rawSource) continue;

    // Decode URI up to 2 levels to handle nested/escaped parameters
    let decoded = rawSource;
    try { decoded = decodeURIComponent(rawSource); } catch {}
    try { decoded = decodeURIComponent(decoded); } catch {}

    // Match product_<id> pattern directly anywhere in the string
    const directMatch = /product_([a-zA-Z0-9_-]+)/.exec(decoded);
    if (directMatch && directMatch[1]) {
      return directMatch[1];
    }

    // Match parameter keys startapp=..., start_param=..., tgWebAppStartParam=...
    const paramMatch = /(?:startapp|start_param|tgWebAppStartParam)=([a-zA-Z0-9_-]+)/.exec(decoded);
    if (paramMatch && paramMatch[1]) {
      const val = paramMatch[1];
      return val.startsWith("product_") ? val.replace("product_", "") : val;
    }
  }

  return null;
}

export function useDeepLink() {
  const router = useRouter();

  useEffect(() => {
    let hasRedirected = false;

    function checkAndRedirect(): boolean {
      if (hasRedirected) return true;

      const productId = extractProductId();
      if (!productId) return false;

      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      const targetPath = `/products/${productId}`;

      if (currentPath === targetPath) {
        hasRedirected = true;
        return true;
      }

      hasRedirected = true;
      router.replace(targetPath);
      return true;
    }

    // Try immediately
    if (checkAndRedirect()) return;

    // Retry for up to 5 seconds to catch delayed Telegram WebApp SDK loading
    const startTime = Date.now();
    const interval = setInterval(() => {
      if (checkAndRedirect() || Date.now() - startTime > 5000) {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [router]);
}
