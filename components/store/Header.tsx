"use client";

import { useTelegramUser } from "@/lib/useTelegramUser";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header({ storeName = "Haben tech" }: { storeName?: string }) {
  const { user } = useTelegramUser();
  const { t } = useLanguage();

  return (
    <header className="store-header">
      <div className="store-header__brand">
        <div className="store-header__logo">
          <img src="/logo.jpg" alt="Habentech Logo" className="store-header__logo-img" />
        </div>
        <div className="store-header__text">
          <p className="store-header__name">{storeName}</p>
          {user?.first_name && (
            <p className="store-header__greeting">{t("header.greeting", { name: user.first_name })}</p>
          )}
        </div>
      </div>
      <LanguageSwitcher />
    </header>
  );
}