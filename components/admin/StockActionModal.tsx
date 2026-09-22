"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import { apiPost, ApiError } from "@/lib/apiClient";
import { REMOVE_STOCK_REASONS, type InventoryRecord, type InventoryTransaction } from "@/types/inventory";

export type StockAction = "add" | "remove" | "adjust";

interface StockActionModalProps {
  action: StockAction | null;
  inventory: InventoryRecord;
  onClose: () => void;
  onApplied: (inventory: InventoryRecord, transaction: InventoryTransaction) => void;
}

const TITLES: Record<StockAction, string> = {
  add: "admin.stockAction.add",
  remove: "admin.stockAction.remove",
  adjust: "admin.stockAction.adjust",
};

const ENDPOINTS: Record<StockAction, string> = {
  add: "add-stock",
  remove: "remove-stock",
  adjust: "adjust-stock",
};

export default function StockActionModal({ action, inventory, onClose, onApplied }: StockActionModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [newQuantity, setNewQuantity] = useState(String(inventory.quantity));
  const [costPrice, setCostPrice] = useState("");
  const [supplier, setSupplier] = useState("");
  const [reason, setReason] = useState(REMOVE_STOCK_REASONS[0]);
  const [adjustReason, setAdjustReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();
  const { t, tv } = useLanguage();

  if (!action) return null;
  const currentAction: StockAction = action;

  async function handleSubmit() {
    setIsSaving(true);
    try {
      let payload: Record<string, unknown>;

      if (action === "add") {
        const qty = Number(quantity);
        if (!qty || qty <= 0) {
          showToast("error", t("admin.stockAction.quantityError"));
          setIsSaving(false);
          return;
        }
        payload = {
          quantity: qty,
          cost_price: costPrice ? Number(costPrice) : undefined,
          supplier: supplier.trim() || undefined,
          notes: notes.trim() || undefined,
        };
      } else if (action === "remove") {
        const qty = Number(quantity);
        if (!qty || qty <= 0) {
          showToast("error", t("admin.stockAction.removeQuantityError"));
          setIsSaving(false);
          return;
        }
        if (qty > inventory.quantity) {
          showToast("error", t("admin.stockAction.insufficientStock"));
          setIsSaving(false);
          return;
        }
        payload = { quantity: qty, reason, notes: notes.trim() || undefined };
      } else {
        const qty = Number(newQuantity);
        if (qty < 0 || Number.isNaN(qty)) {
          showToast("error", t("admin.stockAction.negativeError"));
          setIsSaving(false);
          return;
        }
        if (!adjustReason.trim()) {
          showToast("error", t("admin.stockAction.reasonRequired"));
          setIsSaving(false);
          return;
        }
        payload = { new_quantity: qty, reason: adjustReason.trim(), notes: notes.trim() || undefined };
      }

      const result = await apiPost<{ inventory: InventoryRecord; transaction: InventoryTransaction }>(
        `/api/inventory/${inventory.product_id}/${ENDPOINTS[currentAction]}`,
        payload
      );

      showToast(
        "success",
        action === "add"
          ? t("admin.stockAction.addSuccess")
          : action === "remove"
          ? t("admin.stockAction.removeSuccess")
          : t("admin.stockAction.adjustSuccess")
      );
      onApplied(result.inventory, result.transaction);
      onClose();
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : t("admin.stockAction.updateError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t(TITLES[action])}
      surface="admin"
      footer={
        <>
          <Button surface="admin" variant="secondary" block onClick={onClose}>
            {t("admin.cancel")}
          </Button>
          <Button surface="admin" variant="primary" block loading={isSaving} onClick={handleSubmit}>
            {t(TITLES[action])}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 13, color: "var(--admin-text-muted)" }}>
        {t("admin.stockAction.currentQuantity")} <strong style={{ color: "var(--admin-text)" }}>{inventory.quantity}</strong>
      </p>

      {action === "add" && (
        <>
          <Input surface="admin" label={t("admin.stockAction.quantityToAdd")} type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          <div className="admin-form__row">
            <Input
              surface="admin"
              label={t("admin.stockAction.costPrice")}
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
            <Input surface="admin" label={t("admin.stockAction.supplier")} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </div>
          {quantity && Number(quantity) > 0 && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--admin-text-muted)" }}>
              {t("admin.stockAction.newQuantity")} <strong>{inventory.quantity + (Number(quantity) || 0)}</strong>
            </p>
          )}
        </>
      )}

      {action === "remove" && (
        <>
          <Input
            surface="admin"
            label={t("admin.stockAction.quantity")}
            type="number"
            min="1"
            max={inventory.quantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Select
            surface="admin"
            label={t("admin.stockAction.reason")}
            value={reason}
            onChange={(value) => setReason(value)}
            options={REMOVE_STOCK_REASONS.map((r) => ({ value: r, label: tv("stockRemoveReason", r) }))}
          />
          {quantity && Number(quantity) > 0 && Number(quantity) <= inventory.quantity && (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--admin-text-muted)" }}>
              {t("admin.stockAction.newQuantity")} <strong>{inventory.quantity - (Number(quantity) || 0)}</strong>
            </p>
          )}
        </>
      )}

      {action === "adjust" && (
        <>
          <Input
            surface="admin"
            label={t("admin.stockAction.newQuantity")}
            type="number"
            min="0"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
          />
          <Input
            surface="admin"
            label={t("admin.stockAction.reason")}
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder={t("admin.stockAction.adjustReasonPlaceholder")}
          />
        </>
      )}

      <Textarea surface="admin" label={t("admin.stockAction.notes")} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
    </Modal>
  );
}
