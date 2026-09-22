"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, ExternalLink, ChevronDown, Check, X } from "lucide-react";
import { apiGet, apiPatch, ApiError } from "@/lib/apiClient";
import { formatDate, formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import type { ProductRequest, RequestStatus } from "@/types/request";

const STATUS_OPTIONS: { status: RequestStatus; labelKey: "admin.markCompleted" | "admin.markSold" | "admin.markUnavailable" }[] = [
  { status: "Completed", labelKey: "admin.markCompleted" },
  { status: "Sold", labelKey: "admin.markSold" },
  { status: "Unavailable", labelKey: "admin.markUnavailable" },
];

export default function RequestsList() {
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuRequestId, setMenuRequestId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t, tv } = useLanguage();

  useEffect(() => {
    apiGet<{ requests: ProductRequest[] }>("/api/requests")
      .then((data) => setRequests(data.requests))
      .catch(() => setRequests([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!menuRequestId) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [menuRequestId]);

  async function updateStatus(id: string, status: RequestStatus) {
    const previous = requests;
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    setMenuRequestId(null);
    try {
      await apiPatch(`/api/requests/${id}`, { status });
      showToast("success", t("admin.requestsList.markedAs", { status: tv("requestStatus", status) }));
    } catch (error) {
      setRequests(previous);
      showToast("error", error instanceof ApiError ? error.message : t("admin.requestsList.updateError"));
    }
  }

  if (isLoading) {
    return (
      <div className="loading-page">
        <Spinner surface="admin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        surface="admin"
        icon={<MessageSquareText size={24} />}
        title={t("admin.requestsList.emptyTitle")}
        description={t("admin.requestsList.emptyDescription")}
      />
    );
  }

  return (
    <div className="admin-list">
      {requests.map((request) => (
        <div className="admin-list-item" key={request.id}>
          <div className="admin-list-item__top">
            <div>
              <p className="admin-list-item__title">{request.product?.name ?? t("product.product")}</p>
              <p className="admin-list-item__subtitle">
                {request.customer_name}
                {request.username ? ` · @${request.username}` : ""}
              </p>
            </div>
            <span className={`admin-badge admin-badge--${request.status.toLowerCase()}`}>
              {tv("requestStatus", request.status)}
            </span>
          </div>
          <div className="admin-list-item__meta-row">
            {request.product && (
              <span>
                {t("admin.requestsList.price")} <strong>{formatPrice(request.product.price, request.product.currency)}</strong>
              </span>
            )}
            <span>{formatDate(request.created_at)}</span>
          </div>
          <div className="admin-list-item__actions">
            {request.username && (
              <a href={`https://t.me/${request.username}`} target="_blank" rel="noopener noreferrer">
                <Button surface="admin" variant="secondary" size="sm">
                  <ExternalLink size={14} />
                  {t("admin.contact")}
                </Button>
              </a>
            )}
            <Button surface="admin" variant="secondary" size="sm" onClick={() => setMenuRequestId(request.id)}>
              {t("admin.updateStatusLabel")}
              <ChevronDown size={14} />
            </Button>
          </div>
        </div>
      ))}

      {menuRequestId && (
        <div className="modal-overlay" role="presentation" onClick={() => setMenuRequestId(null)}>
          <div className="modal modal--admin" role="menu" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{t("admin.updateStatusTitle")}</h2>
              <button type="button" className="modal__close" onClick={() => setMenuRequestId(null)} aria-label={t("admin.cancel")}>
                <X size={18} />
              </button>
            </div>
            <div className="select-sheet-list">
              {STATUS_OPTIONS.map(({ status, labelKey }) => (
                <button
                  key={status}
                  type="button"
                  role="menuitem"
                  className="select-sheet-option select-sheet-option--admin"
                  onClick={() => menuRequestId && updateStatus(menuRequestId, status)}
                >
                  <span>{t(labelKey)}</span>
                  <Check size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}