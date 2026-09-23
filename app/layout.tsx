import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Yegna Suqq | የኛ ሱቅ - Telegram Marketplace",
  description: "Browse and order from verified local shops directly inside Telegram with Yegna Suqq (የኛ ሱቅ).",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body>
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}