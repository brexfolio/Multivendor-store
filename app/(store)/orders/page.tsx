"use client";

import { useEffect, useState } from "react";
import { PackageX, WifiOff } from "lucide-react";
import Header from "@/components/store/Header";
import EmptyState from "@/components/ui/EmptyState";
import { LoadingPage } from "@/components/ui/Loading";
import { apiGet } from "@/lib/apiClient";
import { formatDate, formatPrice } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { Order } from "@/types/order";

export default function OrdersPage() {
  const { t, tv } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    apiGet<{ orders: Order[] }>("/api/orders")
      .then((data) => setOrders(data.orders))
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="store-shell">
      <Header />
      <div className="page-header">
        <h1 className="page-header__title">{t("orders.title")}</h1>
      </div>

      {isLoading ? (
        <LoadingPage />
      ) : hasError ? (
        <EmptyState
          icon={<WifiOff size={26} />}
          title={t("common.loadErrorTitle")}
          description={t("common.loadErrorDescription")}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<PackageX size={26} />}
          title={t("orders.emptyTitle")}
          description={t("orders.emptyDescription")}
        />
      ) : (
        orders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-card__top">
              <p className="order-card__name">{order.product?.name ?? t("product.emptyName")}</p>
              <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>
                {tv("orderStatus", order.status)}
              </span>
            </div>
            <p className="order-card__meta">{t("orders.quantityPrefix")} {order.quantity}</p>
            <p className="order-card__meta">
              {t("orders.totalPrefix")} {formatPrice(order.total_price, order.product?.currency ?? "ETB")}
            </p>
            <p className="order-card__meta">{formatDate(order.created_at)}</p>
          </div>
        ))
      )}
    </div>
  );
}
