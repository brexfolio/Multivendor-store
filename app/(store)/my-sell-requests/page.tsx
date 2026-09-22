"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, ArrowLeft, WifiOff } from "lucide-react";
import Header from "@/components/store/Header";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { LoadingPage } from "@/components/ui/Loading";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPost, ApiError } from "@/lib/apiClient";
import { formatDate, formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { SellRequest } from "@/types/sellRequest";

export default function MySellRequestsPage() {
  const { t, tv } = useLanguage();
  const [requests, setRequests] = useState<SellRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { showToast } = useToast();

  function loadRequests() {
    setIsLoading(true);
    setHasError(false);
    apiGet<{ sellRequests: SellRequest[] }>("/api/sell-requests/my")
      .then((data) => setRequests(data.sellRequests))
      .catch(() => {
        setRequests([]);
        setHasError(true);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function respondToOffer(id: string, action: "accept" | "reject") {
    setRespondingId(id);
    try {
      const result = await apiPost<{ sellRequest: SellRequest }>(`/api/sell-requests/${id}/${action}-offer`);
      showToast("success", action === "accept" ? t("sellRequests.offerAccepted") : t("sellRequests.offerRejected"));
      setRequests((prev) => prev.map((r) => (r.id === id ? result.sellRequest : r)));
    } catch (error) {
      showToast("error", error instanceof ApiError ? error.message : t("sellRequests.unableToRespond"));
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="store-shell">
      <Header />
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/sell-device" aria-label={t("sellRequests.backToSell")}>
          <ArrowLeft size={18} />
        </Link>
        <h1 className="page-header__title">{t("sellRequests.title")}</h1>
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : hasError ? (
        <EmptyState
          icon={<WifiOff size={26} />}
          title={t("common.loadErrorTitle")}
          description={t("common.loadErrorDescription")}
          action={
            <Button onClick={loadRequests} style={{ marginTop: 12 }}>
              {t("common.retry")}
            </Button>
          }
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Smartphone size={26} />}
          title={t("sellRequests.emptyTitle")}
          description={t("sellRequests.emptyDescription")}
          action={
            <Link href="/sell-device" style={{ marginTop: 12, display: "inline-block" }}>
              <Button>{t("sellRequests.sellADevice")}</Button>
            </Link>
          }
        />
      ) : (
        requests.map((request) => {
          const image = [...(request.images ?? [])].sort((a, b) => a.display_order - b.display_order)[0];
          const deviceName = request.product_name || `${request.brand} ${request.model}`;
          const latestOffer = [...(request.offers ?? [])]
            .filter((o) => o.status === "Pending")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          return (
            <div className="sell-request-card" key={request.id}>
              {image ? (
                <img src={image.image_url} alt={deviceName} className="sell-request-card__image" />
              ) : (
                <div className="sell-request-card__image" />
              )}
              <div className="sell-request-card__body">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{deviceName}</p>
                  <span className={`status-pill status-pill--${request.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {tv("sellRequestStatus", request.status)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "var(--store-text-muted)" }}>
                  {t("sellRequests.expectedPrefix")} {formatPrice(request.expected_price, request.currency)}
                </p>
                {latestOffer && (
                  <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--store-primary)" }}>
                    {t("sellRequests.storeOfferPrefix")} {formatPrice(latestOffer.offer_price, latestOffer.currency)}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: 11.5, color: "var(--store-text-muted)" }}>
                  {formatDate(request.created_at)}
                </p>
                {request.status === "Offer Sent" && latestOffer && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <Button
                      size="sm"
                      variant="primary"
                      loading={respondingId === request.id}
                      onClick={() => respondToOffer(request.id, "accept")}
                    >
                      {t("sellRequests.acceptOffer")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={respondingId === request.id}
                      onClick={() => respondToOffer(request.id, "reject")}
                    >
                      {t("sellRequests.rejectOffer")}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
