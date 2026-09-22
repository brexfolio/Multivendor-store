"use client";

import { useState } from "react";
import { PackagePlus, PackageMinus, SlidersHorizontal, ImageOff } from "lucide-react";
import Button from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { getStockStatus, type InventoryRecord } from "@/types/inventory";
import StockActionModal, { type StockAction } from "./StockActionModal";
import InventoryTransactionHistory from "./InventoryTransactionHistory";

const STATUS_CLASS: Record<string, string> = {
  "In Stock": "admin-badge--in-stock",
  "Low Stock": "admin-badge--low-stock",
  "Out of Stock": "admin-badge--out-of-stock",
};

export default function InventoryDetail({
  inventory,
  onUpdated,
}: {
  inventory: InventoryRecord;
  onUpdated: (inventory: InventoryRecord) => void;
}) {
  const [action, setAction] = useState<StockAction | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const { t, tv } = useLanguage();
  const status = getStockStatus(inventory.quantity, inventory.minimum_stock_level);
  const image = inventory.product?.images?.[0]?.image_url;

  function handleApplied(updated: InventoryRecord) {
    onUpdated(updated);
    setHistoryKey((k) => k + 1);
  }

  return (
    <div style={{ padding: "0 18px 100px" }}>
      <div className="admin-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            overflow: "hidden",
            background: "var(--admin-surface-alt)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image ? (
            <img src={image} alt={inventory.product?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <ImageOff size={20} color="var(--admin-text-muted)" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="admin-list-item__title">{inventory.product?.name}</p>
          <p className="admin-list-item__subtitle">{t("admin.sku")} {inventory.sku || "—"}</p>
        </div>
        <span className={`admin-badge ${STATUS_CLASS[status]}`}>{tv("availability", status)}</span>
      </div>

      <div className="admin-stat-grid" style={{ padding: 0, marginBottom: 14 }}>
        <div className="admin-stat-card">
          <p className="admin-stat-card__value">{inventory.quantity}</p>
          <p className="admin-stat-card__label">{t("admin.inventoryList.currentQty")}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__value">{inventory.minimum_stock_level}</p>
          <p className="admin-stat-card__label">{t("admin.inventoryList.minStock")}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__value">{inventory.cost_price != null ? formatPrice(inventory.cost_price) : "—"}</p>
          <p className="admin-stat-card__label">{t("admin.inventoryList.costPrice")}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__value">
            {inventory.product ? formatPrice(inventory.product.price, inventory.product.currency) : "—"}
          </p>
          <p className="admin-stat-card__label">{t("admin.inventoryList.sellingPrice")}</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-list-item__meta-row" style={{ marginBottom: 0 }}>
          <span>
            {t("admin.inventoryList.supplier")} <strong>{inventory.supplier || "—"}</strong>
          </span>
          <span>
            {t("admin.inventoryList.location")} <strong>{inventory.storage_location || "—"}</strong>
          </span>
          <span>
            {t("admin.inventoryList.purchaseDate")} <strong>{inventory.purchase_date || "—"}</strong>
          </span>
        </div>{inventory.notes && (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--admin-text-muted)" }}>{inventory.notes}</p>
        )}
      </div>

      <div className="admin-list-item__actions" style={{ marginBottom: 18 }}>
        <Button surface="admin" variant="primary" size="sm" onClick={() => setAction("add")}>
          <PackagePlus size={14} />
          {t("admin.stockAction.add")}
        </Button>
        <Button surface="admin" variant="secondary" size="sm" onClick={() => setAction("remove")}>
          <PackageMinus size={14} />
          {t("admin.stockAction.remove")}
        </Button>
        <Button surface="admin" variant="secondary" size="sm" onClick={() => setAction("adjust")}>
          <SlidersHorizontal size={14} />
          {t("admin.stockAction.adjust")}
        </Button>
      </div>

      <p className="admin-form__label" style={{ padding: "0 0 10px" }}>
        {t("admin.inventoryList.transactionHistory")}
      </p>
      <div style={{ margin: "0 -18px" }}>
        <InventoryTransactionHistory key={historyKey} productId={inventory.product_id} />
      </div>

      {action && (
        <StockActionModal action={action} inventory={inventory} onClose={() => setAction(null)} onApplied={handleApplied} />
      )}
    </div>
  );
}
