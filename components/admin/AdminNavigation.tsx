"use client";

import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "@/components/store/LanguageSwitcher";

interface AdminNavigationProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function AdminNavigation({ title, subtitle, onBack }: AdminNavigationProps) {
  const { t } = useLanguage();

  return (
    <div className="admin-topnav">
      <div className="admin-topnav__left">
        {onBack && (
          <button type="button" className="admin-topnav__back" onClick={onBack} aria-label={t("admin.back")}>
            <ArrowLeft size={19} />
          </button>
        )}
        <div>
          <h1 className="admin-topnav__title">{title}</h1>
          {subtitle && <p className="admin-topnav__subtitle">{subtitle}</p>}
        </div>
      </div>
      <LanguageSwitcher surface="admin" />
    </div>
  );
}
