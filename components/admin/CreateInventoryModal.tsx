"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import { apiGet, apiPost, ApiError } from "@/lib/apiClient";
import type { Product } from "@/types/product";
import type { InventoryRecord } from "@/types/inventory";

interface CreateInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProductIds: string[];
  onCreated: (inventory: InventoryRecord) => void;
}

export default function CreateInventoryModal({
  isOpen,
  onClose,
  existingProductIds,
  onCreated,
}: CreateInventoryModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [minimumStockLevel, setMinimumStockLevel] = useState("0");
  const [costPrice, setCostPrice] = useState("");
  const [sku, setSku] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    apiGet<{ products: Product[] }>("/api/products")
      .then((data) => {
        const available = data.products.filter((p) => !existingProductIds.includes(p.id));
        setProducts(available);
        setProductId(available[0]?.id ?? "");
      })
      .catch(() => setProducts([]));
  }, [isOpen, existingProductIds]);

  async function handleCreate() {
    if (!productId) {
      showToast("error", t("admin.inventoryModal.selectFirst"));
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiPost<{ inventory: InventoryRecord }>("/api/inventory", {
        product_id: productId,
        sku: sku.trim() || null,
        quantity: Number(quantity) || 0,
        minimum_stock_level: Number(minimumStockLevel) || 0,
        cost_price: costPrice ? Number(costPrice) : null,
      });
      showToast("success", t("admin.inventoryModal.success"));
      onCreated(result.inventory);
      onClose();
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : t("admin.inventoryModal.error"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.inventoryModal.title")}
      surface="admin"
      footer={
        <>
          <Button surface="admin" variant="secondary" onClick={onClose}>
            {t("admin.cancel")}
          </Button>
          <Button surface="admin" variant="primary" loading={isSaving} onClick={handleCreate}>
            {t("admin.inventoryModal.startTracking")}
          </Button>
        </>
      }
    >
      {products.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "var(--admin-text-muted)" }}>
          {t("admin.inventoryModal.allTracked")}
        </p>
      ) : (
        <div className="admin-form__grid-2">
          <Select
            surface="admin"
            label={t("admin.inventoryModal.product")}
            value={productId}
            onChange={(value) => setProductId(value)}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Input
            surface="admin"
            label={t("admin.inventoryModal.currentQuantity")}
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            surface="admin"
            label={t("admin.inventoryModal.minimumStock")}
            type="number"
            min="0"
            value={minimumStockLevel}
            onChange={(e) => setMinimumStockLevel(e.target.value)}
          />
          <Input
            surface="admin"
            label={t("admin.inventoryModal.costPrice")}
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />
          <Input surface="admin" label={t("admin.inventoryModal.sku")} value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
      )}
    </Modal>
  );
}
