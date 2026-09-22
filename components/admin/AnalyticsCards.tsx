"use client";

import { useEffect, useState } from "react";
import {
  Package,
  CheckCircle2,
  TrendingUp,
  ShoppingBag,
  Clock,
  MessageSquareText,
  Smartphone,
  Boxes,
  AlertTriangle,
  PackageX,
  Database,
} from "lucide-react";
import { apiGet, ApiError } from "@/lib/apiClient";
import { Spinner } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import { useLanguage } from "@/lib/i18n";

interface Analytics {
  totalProducts: number;
  availableProducts: number;
  soldProducts: number;
  totalOrders: number;
  pendingOrders: number;
  productRequests: number;
  pendingSellRequests: number;
  totalUnitsInStock: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryValue: number;
}

export default function AnalyticsCards() {
  const [data, setData] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    apiGet<Analytics>("/api/analytics")
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("admin.analyticsCards.loadError")))
      .finally(() => setIsLoading(false));
  }, [t]);

  if (isLoading) {
    return (
      <div className="admin-analytics">
        <div className="loading-page">
          <Spinner surface="admin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-analytics">
        <EmptyState
          surface="admin"
          icon={<AlertTriangle size={24} />}
          title={t("admin.analyticsCards.loadError")}
          description={error ?? t("admin.analyticsCards.retryHint")}
        />
      </div>
    );
  }

  const cards = [
    { icon: Package, label: t("admin.analyticsCards.totalProducts"), value: data.totalProducts, tone: "cyan" },
    { icon: CheckCircle2, label: t("admin.analyticsCards.availableProducts"), value: data.availableProducts, tone: "green" },
    { icon: TrendingUp, label: t("admin.analyticsCards.soldProducts"), value: data.soldProducts, tone: "blue" },
    { icon: ShoppingBag, label: t("admin.analyticsCards.totalOrders"), value: data.totalOrders, tone: "orange" },
    { icon: Clock, label: t("admin.analyticsCards.pendingOrders"), value: data.pendingOrders, tone: "blue" },
    { icon: MessageSquareText, label: t("admin.analyticsCards.productRequests"), value: data.productRequests, tone: "pink" },
    { icon: Smartphone, label: t("admin.analyticsCards.sellRequests"), value: data.pendingSellRequests, tone: "cyan" },
    { icon: Boxes, label: t("admin.analyticsCards.totalUnits"), value: data.totalUnitsInStock, tone: "teal" },
    { icon: AlertTriangle, label: t("admin.analyticsCards.lowStock"), value: data.lowStockProducts, tone: "red" },
    { icon: PackageX, label: t("admin.analyticsCards.outOfStock"), value: data.outOfStockProducts, tone: "rose" },
  ];

  return (
    <div className="admin-analytics">
      <div className="admin-stat-grid">
        {cards.map(({ icon: Icon, label, value, tone }) => (
          <div className="admin-stat-card" key={label}>
            <div className={`admin-stat-card__icon admin-stat-card__icon--${tone}`}>
              <Icon size={18} />
            </div>
            <p className="admin-stat-card__value">{value}</p>
            <p className="admin-stat-card__label">{label}</p>
          </div>
        ))}
      </div>

      <div className="analytics-inventory">
        <div className="analytics-inventory__glow" />
        <div className={`admin-stat-card__icon admin-stat-card__icon--blue analytics-inventory__icon`}>
          <Database size={22} />
        </div>
        <div className="analytics-inventory__value">{data.inventoryValue.toLocaleString("en-US")}</div>
        <div className="analytics-inventory__currency">ETB</div>
        <div className="analytics-inventory__label">{t("admin.analyticsCards.inventoryValue")}</div>
      </div>
    </div>
  );
}
