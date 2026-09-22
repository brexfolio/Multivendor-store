"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone, ImageOff } from "lucide-react";
import { apiGet } from "@/lib/apiClient";
import { formatDate, formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Spinner } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import type { SellRequest } from "@/types/sellRequest";

interface SellRequestsListProps {
  onSelect: (request: SellRequest) => void;
}

export default function SellRequestsList({ onSelect }: SellRequestsListProps) {
  const [requests, setRequests] = useState<SellRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, tv } = useLanguage();

  const loadRequests = useCallback(() => {
    setIsLoading(true);
    apiGet<{ sellRequests: SellRequest[] }>("/api/sell-requests")
      .then((data) => setRequests(data.sellRequests))
      .catch(() => setRequests([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

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
        icon={<Smartphone size={24} />}
        title={t("admin.sell.emptyTitle")}
        description={t("admin.sell.emptyDescription")}
      />
    );
  }

  return (
    <div className="admin-list admin-list--flat">
      {requests.map((request) => {
        const image = [...(request.images ?? [])].sort((a, b) => a.display_order - b.display_order)[0];
        const deviceName = request.product_name || `${request.brand} ${request.model}`;

        return (
          <button
            key={request.id}
            type="button"
            className="admin-list-item"
            style={{ textAlign: "left", width: "100%", cursor: "pointer" }}
            onClick={() => onSelect(request)}
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
                    <img src={image.image_url} alt={deviceName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageOff size={16} color="var(--admin-text-muted)" />
                  )}
                </div>
                <div>
                  <p className="admin-list-item__title">{deviceName}</p>
                  <p className="admin-list-item__subtitle">
                    {tv("sellCategory", request.category)} · {tv("sellCondition", request.condition)}
                  </p>
                </div>
              </div>
              <span className={`admin-badge admin-badge--${request.status.toLowerCase().replace(/\s+/g, "-")}`}>
                {tv("sellRequestStatus", request.status)}
              </span>
            </div>
            <div className="admin-list-item__meta-row">
              <span>
                {t("admin.sell.expected")} <strong>{formatPrice(request.expected_price, request.currency)}</strong>
              </span>
              <span>
                {request.customer_name}
                {request.telegram_username ? ` · @${request.telegram_username}` : ""}
              </span>
              <span>{formatDate(request.created_at)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
