"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import AdminNavigation from "@/components/admin/AdminNavigation";
import SellRequestsList from "@/components/admin/SellRequestsList";
import SellRequestDetail from "@/components/admin/SellRequestDetail";
import { useLanguage } from "@/lib/i18n";
import { useTelegramUser } from "@/lib/useTelegramUser";
import type { SellRequest } from "@/types/sellRequest";

export default function AdminSellRequestsPage() {
  useTelegramUser();
  const router = useRouter();
  const [selected, setSelected] = useState<SellRequest | null>(null);
  const [listKey, setListKey] = useState(0);
  const { t } = useLanguage();

  function handleBack() {
    if (selected) {
      setSelected(null);
      setListKey((k) => k + 1);
      return;
    }
    router.push("/admin");
  }

  return (
    <AdminGate>
      <div className="admin-shell">
        <AdminNavigation
          title={selected ? selected.product_name || `${selected.brand} ${selected.model}` : t("admin.sellRequests")}
          onBack={handleBack}
        />

        {!selected && (
          <p className="admin-page-subheading">{t("admin.sellRequestsSubtitle")}</p>
        )}

        {selected ? (
          <SellRequestDetail sellRequest={selected} onUpdated={setSelected} />
        ) : (
          <SellRequestsList key={listKey} onSelect={setSelected} />
        )}
      </div>
    </AdminGate>
  );
}
