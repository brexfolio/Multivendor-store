"use client";

import { useTelegramUser } from "@/lib/useTelegramUser";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import { Sparkles } from "lucide-react";

export default function Header({ storeName = "Yegna Suqq | የኛ ሱቅ" }: { storeName?: string }) {
  const { user } = useTelegramUser();
  const { t } = useLanguage();

  return (
    <header className="store-header ys-glass">
      <div className="store-header__brand">
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #0284c7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            flexShrink: 0,
          }}
        >
          YS
        </div>
        <div className="store-header__text" style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <p className="store-header__name" style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em" }}>
              {storeName}
            </p>
            <Sparkles size={13} color="#38bdf8" />
          </div>
          {user?.first_name ? (
            <p className="store-header__greeting" style={{ margin: 0, fontSize: 11.5, color: "#94a3b8" }}>
              {t("header.greeting", { name: user.first_name })}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
              Multi-Vendor Marketplace
            </p>
          )}
        </div>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
