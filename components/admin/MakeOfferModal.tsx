"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import { apiPost, ApiError } from "@/lib/apiClient";
import type { SellRequest } from "@/types/sellRequest";

interface MakeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellRequest: SellRequest;
  onOfferSent: (updated: SellRequest) => void;
}

export default function MakeOfferModal({ isOpen, onClose, sellRequest, onOfferSent }: MakeOfferModalProps) {
  const [offerPrice, setOfferPrice] = useState(String(sellRequest.expected_price));
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { showToast } = useToast();
  const { t } = useLanguage();

  async function handleSend() {
    const price = Number(offerPrice);
    if (!price || price <= 0) {
      showToast("error", t("admin.offer.priceError"));
      return;
    }

    setIsSending(true);
    try {
      const result = await apiPost<{ sellRequest: SellRequest }>(`/api/sell-requests/${sellRequest.id}/offer`, {
        offer_price: price,
        message: message.trim() || undefined,
      });
      showToast("success", t("admin.offer.sent"));
      onOfferSent(result.sellRequest);
      onClose();
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : t("admin.offer.sendError"));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("admin.offer.title")}
      surface="admin"
      footer={
        <>
          <Button surface="admin" variant="secondary" block onClick={onClose}>
            {t("admin.cancel")}
          </Button>
          <Button surface="admin" variant="primary" block loading={isSending} onClick={handleSend}>
            {t("admin.offer.send")}
          </Button>
        </>
      }
    >
      <Input
        surface="admin"
        label={t("admin.offer.priceLabel", { currency: sellRequest.currency })}
        type="number"
        min="0"
        step="0.01"
        value={offerPrice}
        onChange={(e) => setOfferPrice(e.target.value)}
      />
      <Textarea
        surface="admin"
        label={t("admin.offer.optionalMessage")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t("admin.offer.messagePlaceholder")}
        rows={3}
      />
    </Modal>
  );
}
