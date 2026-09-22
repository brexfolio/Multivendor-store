"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  Settings,
  BarChart3,
  ClipboardList,
  Archive,
  Zap,
  ShoppingBag,
  CircleAlert,
  DollarSign,
  Package,
  Smartphone,
  Boxes,
  Star,
  Pencil,
} from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import AdminNavigation from "@/components/admin/AdminNavigation";
import AdminActionCard from "@/components/admin/AdminActionCard";
import ProductForm from "@/components/admin/ProductForm";
import ProductList from "@/components/admin/ProductList";
import OrdersList from "@/components/admin/OrdersList";
import RequestsList from "@/components/admin/RequestsList";
import AnalyticsCards from "@/components/admin/AnalyticsCards";
import SettingsForm from "@/components/admin/SettingsForm";
import LanguageSwitcher from "@/components/store/LanguageSwitcher";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/lib/i18n";
import { useTelegramUser } from "@/lib/useTelegramUser";
import { apiGet } from "@/lib/apiClient";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";
import type { StoreSettings } from "@/types/settings";

type AdminView =
  | "menu"
  | "products"
  | "add-product"
  | "edit-product"
  | "orders"
  | "requests"
  | "stock"
  | "analytics"
  | "featured"
  | "settings";

const VIEW_TITLES: Record<AdminView, string> = {
  menu: "admin.menu.title",
  products: "admin.products",
  "add-product": "admin.addProduct",
  "edit-product": "admin.editProduct",
  orders: "admin.orders",
  requests: "admin.requests",
  stock: "admin.stock",
  analytics: "admin.analytics",
  featured: "admin.featured",
  settings: "admin.settings",
};

interface DashboardAnalytics {
  totalProducts: number;
  pendingOrders: number;
  lowStockProducts: number;
  inventoryValue: number;
}

interface ActivityItem {
  id: string;
  type: "order" | "stock" | "alert";
  title: string;
  description: string;
  time: string;
  dotColor: string;
}

function formatRelativeTime(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("admin.dashboard.justNow");
  if (diffMin < 60) return t("admin.dashboard.minAgo", { n: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t("admin.dashboard.hourAgo", { n: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  return t("admin.dashboard.dayAgo", { n: diffDay });
}

export default function AdminPage() {
  const { user } = useTelegramUser();
  const router = useRouter();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [view, setView] = useState<AdminView>("menu");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [listKey, setListKey] = useState(0);

  const [storeName, setStoreName] = useState("Haben Tech");
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    apiGet<{ settings: StoreSettings | null }>("/api/settings")
      .then((res) => {
        if (res.settings?.store_name) setStoreName("Haben Tech");
      })
      .catch(() => {});

    apiGet<{ totalProducts: number; pendingOrders: number; lowStockProducts: number; inventoryValue: number }>("/api/analytics")
      .then(setAnalytics)
      .catch(() => {});

    apiGet<{ orders: Order[] }>("/api/orders")
      .then((res) => {
        const orders = (res.orders ?? []).slice(0, 5);
        const items: ActivityItem[] = orders.map((o) => ({
          id: o.id,
          type: "order" as const,
          title: t("admin.dashboard.newOrder"),
          description: o.product
            ? `${o.quantity}x ${o.product.name} \u2022 ${o.status}`
            : `${o.quantity} ${t("admin.dashboard.items")}`,
          time: formatRelativeTime(o.created_at, t),
          dotColor: o.status === "Pending" ? "blue" : o.status === "Completed" ? "green" : o.status === "Cancelled" ? "red" : "amber",
        }));
        setActivity(items);
      })
      .catch(() => {});
  }, [t]);

  function goTo(next: AdminView) {
    setView(next);
  }

  function handleBack() {
    if (view === "edit-product") {
      setView("products");
      setEditingProduct(null);
      return;
    }
    setView("menu");
  }

  function handleProductSaved(_product: Product, channelWarning: string | null) {
    showToast(channelWarning ? "warning" : "success", channelWarning ?? "Product saved successfully.");
    setListKey((k) => k + 1);
    setEditingProduct(null);
    setView("products");
  }

  return (
    <AdminGate>
      <div className="admin-shell">
        {view === "menu" ? (
          <div className="admin-dashboard">
            <div className="admin-welcome">
              <div className="admin-welcome__top">
                <div className="admin-welcome__brand">
                  <div className="admin-welcome__logo">
                    <img src="/logo.jpg" alt="Habentech Logo" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                  </div>
                  <p className="admin-welcome__store-name">{storeName}</p>
                </div>
                <LanguageSwitcher surface="admin" />
              </div>
              <div className="admin-welcome__message">
                <h1 className="admin-welcome__greeting">
                  {user?.first_name ? t("admin.dashboard.greeting", { name: user.first_name }) : t("admin.dashboard.greetingNoName")}
                </h1>
                <p className="admin-welcome__subtitle">
                  {t("admin.dashboard.youHave")}{" "}
                  <strong>{analytics?.pendingOrders ?? "\u2014"} {t("admin.dashboard.pendingOrders")}</strong>{" "}
                  {t("admin.dashboard.toReview")}
                </p>
              </div>
            </div>

            <div>
              <div className="admin-section-header">
                <h2 className="admin-section-title">{t("admin.dashboard.keyAnalytics")}</h2>
              </div>
              <div className="admin-dashboard-analytics" style={{ marginTop: 16 }}>
                <div className="admin-dashboard-stat">
                  <div className="admin-dashboard-stat__icon admin-dashboard-stat__icon--primary">
                    <Package size={14} strokeWidth={2} />
                  </div>
                  <div className="admin-dashboard-stat__text">
                    <p className="admin-dashboard-stat__label">{t("admin.dashboard.totalProducts")}</p>
                    <p className="admin-dashboard-stat__value">{analytics?.totalProducts ?? "\u2014"}</p>
                  </div>
                </div>

                <div className="admin-dashboard-stat">
                  <div className="admin-dashboard-stat__icon admin-dashboard-stat__icon--warning">
                    <ShoppingBag size={14} strokeWidth={2} />
                  </div>
                  <div className="admin-dashboard-stat__text">
                    <p className="admin-dashboard-stat__label">{t("admin.dashboard.pendingOrdersLabel")}</p>
                    <p className="admin-dashboard-stat__value">{analytics?.pendingOrders ?? "\u2014"}</p>
                  </div>
                </div>

                <div className="admin-dashboard-stat">
                  <div className="admin-dashboard-stat__icon admin-dashboard-stat__icon--danger">
                    <CircleAlert size={14} strokeWidth={2} />
                  </div>
                  <div className="admin-dashboard-stat__text">
                    <p className="admin-dashboard-stat__label">{t("admin.dashboard.lowStockAlerts")}</p>
                    <p className="admin-dashboard-stat__value">{analytics?.lowStockProducts ?? "\u2014"}</p>
                  </div>
                </div>

                <div className="admin-dashboard-stat">
                  <div className="admin-dashboard-stat__icon admin-dashboard-stat__icon--teal">
                    <DollarSign size={14} strokeWidth={2} />
                  </div>
                  <div className="admin-dashboard-stat__text">
                    <p className="admin-dashboard-stat__label">{t("admin.dashboard.revenueToday")}</p>
                    <p className="admin-dashboard-stat__value admin-dashboard-stat__value--sm">
                      {analytics?.inventoryValue != null
                        ? analytics.inventoryValue.toLocaleString()
                        : "\u2014"}
                      {analytics?.inventoryValue != null && (
                        <span className="admin-dashboard-stat__value-sub">ETB</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="admin-section-header">
                <h2 className="admin-section-title">{t("admin.dashboard.quickActions")}</h2>
              </div>
              <div className="admin-grid" style={{ marginTop: 16 }}>
                <AdminActionCard
                  icon={Plus}
                  label={t("admin.dashboard.addProduct")}
                  description={t("admin.dashboard.newElectronics")}
                  tone="accent"
                  onClick={() => goTo("add-product")}
                />
                <AdminActionCard
                  icon={ClipboardList}
                  label={t("admin.dashboard.viewOrders")}
                  description={t("admin.dashboard.reviewQueue")}
                  tone="primary"
                  badge={analytics?.pendingOrders}
                  onClick={() => goTo("orders")}
                />
                <AdminActionCard
                  icon={Archive}
                  label={t("admin.dashboard.manageStock")}
                  description={t("admin.dashboard.updateCounts")}
                  tone="accent"
                  onClick={() => goTo("stock")}
                />
                <AdminActionCard
                  icon={MessageSquare}
                  label={t("admin.dashboard.requests")}
                  description={t("admin.dashboard.userInquiries")}
                  tone="warning"
                  onClick={() => goTo("requests")}
                />
                <AdminActionCard
                  icon={BarChart3}
                  label={t("admin.dashboard.analytics")}
                  description={t("admin.dashboard.shopPerformance")}
                  tone="success"
                  onClick={() => goTo("analytics")}
                />
                <AdminActionCard
                  icon={Settings}
                  label={t("admin.dashboard.settings")}
                  description={t("admin.dashboard.configurations")}
                  tone="primary"
                  onClick={() => goTo("settings")}
                />
                <AdminActionCard
                  icon={Smartphone}
                  label={t("admin.sellRequests")}
                  description={t("admin.card.reviewDevices")}
                  tone="accent"
                  onClick={() => router.push("/admin/sell-requests")}
                />
                <AdminActionCard
                  icon={Boxes}
                  label={t("admin.inventory")}
                  description={t("admin.card.stockHistory")}
                  tone="success"
                  onClick={() => router.push("/admin/inventory")}
                />
                <AdminActionCard
                  icon={Star}
                  label={t("admin.featured")}
                  description={t("admin.card.highlightProducts")}
                  tone="warning"
                  onClick={() => goTo("featured")}
                />
                <AdminActionCard
                  icon={Pencil}
                  label={t("admin.dashboard.editProduct")}
                  description={t("admin.card.updateProducts")}
                  tone="accent"
                  onClick={() => goTo("products")}
                />
              </div>
            </div>

            <div>
              <div className="admin-section-header">
                <h2 className="admin-section-title">{t("admin.dashboard.recentActivity")}</h2>
              </div>
              <div className="admin-activity" style={{ marginTop: 16 }}>
                {activity.length === 0 ? (
                  <div className="admin-activity__empty">{t("admin.dashboard.noRecentActivity")}</div>
                ) : (
                  activity.map((item) => (
                    <div className="admin-activity__item" key={item.id}>
                      <div className={`admin-activity__dot admin-activity__dot--${item.dotColor}`} />
                      <div className="admin-activity__body">
                        <p className="admin-activity__title">{item.title}</p>
                        <p className="admin-activity__desc">{item.description}</p>
                      </div>
                      <span className="admin-activity__time">{item.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <AdminNavigation
              title={t(VIEW_TITLES[view])}
              onBack={handleBack}
            />

            {view === "products" && (
              <ProductList
                key={listKey}
                mode="manage"
                onEdit={(product) => {
                  setEditingProduct(product);
                  setView("edit-product");
                }}
              />
            )}

            {view === "add-product" && (
              <ProductForm onSaved={handleProductSaved} onCancel={() => setView("menu")} />
            )}

            {view === "edit-product" && editingProduct && (
              <ProductForm
                product={editingProduct}
                onSaved={handleProductSaved}
                onCancel={() => {
                  setEditingProduct(null);
                  setView("products");
                }}
              />
            )}

            {view === "orders" && <OrdersList />}
            {view === "requests" && <RequestsList />}
            {view === "stock" && <ProductList key={listKey} mode="stock" />}
            {view === "analytics" && <AnalyticsCards />}
            {view === "featured" && <ProductList key={listKey} mode="featured" />}
            {view === "settings" && <SettingsForm />}
          </>
        )}
      </div>
    </AdminGate>
  );
}
