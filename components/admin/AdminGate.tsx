"use client";

import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAdminAuth } from "@/lib/useAdminAuth";
import { Spinner } from "@/components/ui/Loading";
import { useLanguage } from "@/lib/i18n";

/**
 * Wraps an admin page: shows a spinner while the server verifies
 * the current Telegram user, an "Unauthorized" screen if they're
 * not the configured admin, and only renders `children` (the real
 * admin UI) once authorization is confirmed. Never trust the
 * client's own idea of "is admin" — this always defers to
 * POST /api/admin/verify.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const authState = useAdminAuth();
  const { t } = useLanguage();

  if (authState === "checking") {
    return (
      <div className="admin-shell">
        <div className="loading-page">
          <Spinner surface="admin" />
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="admin-unauthorized">
        <div className="admin-unauthorized__icon">
          <ShieldAlert size={30} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{t("admin.unauthorized")}</h1>
        <p style={{ fontSize: 13.5, color: "var(--admin-text-muted)", maxWidth: 280 }}>
          {t("admin.unauthorizedDescription")}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
