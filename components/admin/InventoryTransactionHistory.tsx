"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Spinner } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import type { InventoryTransaction } from "@/types/inventory";

export default function InventoryTransactionHistory({ productId }: { productId: string }) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, tv } = useLanguage();

  useEffect(() => {
    apiGet<{ transactions: InventoryTransaction[] }>(`/api/inventory/${productId}/transactions`)
      .then((data) => setTransactions(data.transactions))
      .catch(() => setTransactions([]))
      .finally(() => setIsLoading(false));
  }, [productId]);

  if (isLoading) {
    return (
      <div className="loading-page">
        <Spinner surface="admin" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        surface="admin"
        icon={<History size={22} />}
        title={t("admin.history.emptyTitle")}
        description={t("admin.history.emptyDescription")}
      />
    );
  }

  return (
    <div className="admin-list">
      {transactions.map((tx) => (
        <div className="admin-list-item" key={tx.id}>
          <div className="admin-list-item__top">
            <p className="admin-list-item__title">{tv("inventoryTransactionType", tx.transaction_type)}</p>
            <span
              style={{
                fontWeight: 800,
                color: tx.quantity_change >= 0 ? "var(--admin-success)" : "var(--admin-danger)",
              }}
            >
              {tx.quantity_change >= 0 ? `+${tx.quantity_change}` : tx.quantity_change}
            </span>
          </div>
          <div className="admin-list-item__meta-row">
            <span>
              {tx.previous_quantity} → {tx.new_quantity}
            </span>
            {tx.reason && <span>{t("admin.history.reason")} {tx.reason}</span>}
            <span>{formatDate(tx.created_at)}</span>
          </div>
          {tx.notes && <p style={{ margin: 0, fontSize: 12.5, color: "var(--admin-text-muted)" }}>{tx.notes}</p>}
        </div>
      ))}
    </div>
  );
}
