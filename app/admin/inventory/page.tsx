"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import AdminNavigation from "@/components/admin/AdminNavigation";
import InventoryList from "@/components/admin/InventoryList";
import InventoryDetail from "@/components/admin/InventoryDetail";
import { useLanguage } from "@/lib/i18n";
import { useTelegramUser } from "@/lib/useTelegramUser";
import type { InventoryRecord } from "@/types/inventory";

export default function AdminInventoryPage() {
  useTelegramUser();
  const router = useRouter();
  const [selected, setSelected] = useState<InventoryRecord | null>(null);
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
          title={selected ? selected.product?.name ?? t("admin.inventory") : t("admin.inventory")}
          onBack={handleBack}
        />

        {!selected && (
          <p className="admin-page-subheading">{t("admin.inventorySubtitle")}</p>
        )}

        {selected ? (
          <InventoryDetail inventory={selected} onUpdated={setSelected} />
        ) : (
          <InventoryList key={listKey} onSelect={setSelected} />
        )}
      </div>
    </AdminGate>
  );
}
