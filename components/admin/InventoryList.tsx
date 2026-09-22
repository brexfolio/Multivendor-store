"use client";

import { useCallback, useEffect, useState } from "react";
import { Warehouse, ImageOff, Plus } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Spinner } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { getStockStatus, type InventoryRecord } from "@/types/inventory";
import CreateInventoryModal from "./CreateInventoryModal";

interface InventoryListProps {
  onSelect: (inventory: InventoryRecord) => void;
}

const STATUS_CLASS: Record<string, string> = {
  "In Stock": "admin-badge--in-stock",
  "Low Stock": "admin-badge--low-stock",
  "Out of Stock": "admin-badge--out-of-stock",
};

export default function InventoryList({ onSelect }: InventoryListProps) {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { t, tv } = useLanguage();

  const loadInventory = useCallback(() => {
    setIsLoading(true);
    apiGet<{ inventory: InventoryRecord[] }>("/api/inventory")
      .then((data) => setInventory(data.inventory))
      .catch(() => setInventory([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  return (
    <div>
      <div style={{ padding: "0 18px 14px" }}>
        <Button surface="admin" variant="secondary" block onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          {t("admin.inventoryModal.title")}
        </Button>
      </div>

      {isLoading ? (
        <div className="loading-page">
          <Spinner surface="admin" />
        </div>
      ) : inventory.length === 0 ? (
        <EmptyState
          surface="admin"
          icon={<Warehouse size={24} />}
          title={t("admin.inventoryList.emptyTitle")}
          description={t("admin.inventoryList.emptyDescription")}
        />
      ) : (
        <div className="admin-list admin-list--flat">
          {inventory.map((item) => {
            const status = getStockStatus(item.quantity, item.minimum_stock_level);
            const image = item.product?.images?.[0]?.image_url;

            return (
              <button
                key={item.id}
                type="button"
                className="admin-list-item"
                style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
                onClick={() => onSelect(item)}
              >
                <div className="admin-list-item__top">
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--admin-surface-alt)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {image ? (
                        <img src={image} alt={item.product?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <ImageOff size={16} color="var(--admin-text-muted)" />
                      )}
                    </div>
                    <div>
                      <p className="admin-list-item__title">{item.product?.name ?? t("admin.unknownProduct")}</p>
                      <p className="admin-list-item__subtitle">{t("admin.sku")} {item.sku || "—"}</p>
                    </div>
                  </div>
                  <span className={`admin-badge ${STATUS_CLASS[status]}`}>{tv("availability", status)}</span>
                </div>
                <div className="admin-list-item__meta-row" style={{ marginBottom: 0 }}>
                  <span>
                    {t("admin.inventoryList.qty")} <strong>{item.quantity}</strong>
                  </span>
                  <span>
                    {t("admin.inventoryList.min")} <strong>{item.minimum_stock_level}</strong>
                  </span>
                  {item.product && (
                    <span>
                      {t("admin.inventoryList.price")} <strong>{formatPrice(item.product.price, item.product.currency)}</strong>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <CreateInventoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        existingProductIds={inventory.map((i) => i.product_id)}
        onCreated={() => loadInventory()}
      />
    </div>
  );
}
