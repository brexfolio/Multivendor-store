"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Settings,
  BarChart3,
  ClipboardList,
  Archive,
  ShoppingBag,
  CircleAlert,
  DollarSign,
  Package,
  Boxes,
  ExternalLink,
  Share2,
  Clock,
  ShieldAlert,
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
import StoreSwitcher from "@/components/admin/StoreSwitcher";
import VendorOnboardingWizard from "@/components/admin/VendorOnboardingWizard";
import { useToast } from "@/components/ui/Toast";
import { apiGet } from "@/lib/apiClient";
import { formatPrice } from "@/lib/utils";
import { SHOP_TYPE_CONFIGS } from "@/lib/shopTypeConfig";
import type { Tenant } from "@/types/tenant";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";

type AdminView =
  | "menu"
  | "products"
  | "add-product"
  | "edit-product"
  | "orders"
  | "requests"
  | "stock"
  | "analytics"
  | "settings";

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [userStores, setUserStores] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [view, setView] = useState<AdminView>("menu");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [listKey, setListKey] = useState(0);

  const [analytics, setAnalytics] = useState<{
    totalProducts: number;
    pendingOrders: number;
    lowStockProducts: number;
    inventoryValue: number;
  } | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "onboarding") {
      setShowOnboarding(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setIsLoadingStores(true);
    apiGet<{ stores: Tenant[] }>("/api/tenants?my=true")
      .then((data) => {
        const stores = data.stores || [];
        setUserStores(stores);
        if (stores.length > 0) {
          setActiveTenant(stores[0]);
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        setUserStores([]);
      })
      .finally(() => setIsLoadingStores(false));
  }, []);

  // Fetch store-scoped analytics
  useEffect(() => {
    if (!activeTenant) return;

    apiGet<{ totalProducts: number; pendingOrders: number; lowStockProducts: number; inventoryValue: number }>(
      `/api/analytics?tenant_id=${activeTenant.id}`
    )
      .then(setAnalytics)
      .catch(() => {
        setAnalytics({
          totalProducts: 0,
          pendingOrders: 0,
          lowStockProducts: 0,
          inventoryValue: 0,
        });
      });
  }, [activeTenant, listKey]);

  function handleStoreCreated(newTenant: Tenant) {
    setUserStores((prev) => [newTenant, ...prev]);
    setActiveTenant(newTenant);
    setShowOnboarding(false);
    setView("menu");
  }

  function handleProductSaved(_product: Product, channelWarning: string | null) {
    if (channelWarning) {
      showToast("error", `Product saved, but Telegram alert failed: ${channelWarning}`);
    } else {
      showToast("success", "Product published successfully!");
    }
    setEditingProduct(null);
    setView("products");
    setListKey((k) => k + 1);
  }

  if (isLoadingStores) {
    return (
      <AdminGate>
        <div className="admin-shell" style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          Loading your store profile...
        </div>
      </AdminGate>
    );
  }

  if (showOnboarding) {
    return (
      <AdminGate>
        <div className="admin-shell">
          <VendorOnboardingWizard
            onCompleted={handleStoreCreated}
            onCancel={userStores.length > 0 ? () => setShowOnboarding(false) : undefined}
          />
        </div>
      </AdminGate>
    );
  }

  const shopConfig = activeTenant
    ? SHOP_TYPE_CONFIGS[activeTenant.shop_type] || SHOP_TYPE_CONFIGS.other
    : null;

  const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YegnaSuqqBot";
  const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME || "app";
  const storeLink = activeTenant ? `https://t.me/${botUser}/${appName}?startapp=s_${activeTenant.slug}` : "";

  return (
    <AdminGate>
      <div className="admin-shell">
        {/* Top Header & Store Context Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <StoreSwitcher
            currentTenant={activeTenant}
            tenants={userStores}
            onSelectTenant={(t) => {
              setActiveTenant(t);
              setView("menu");
              setListKey((k) => k + 1);
            }}
            onOpenCreateNew={() => setShowOnboarding(true)}
          />

          {activeTenant?.status === "active" && storeLink && (
            <a
              href={storeLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#161b26",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#60a5fa",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <span>View Store</span>
              <ExternalLink size={14} />
            </a>
          )}

          {activeTenant?.status === "pending_approval" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                padding: "6px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Clock size={14} />
              <span>Under Review</span>
            </div>
          )}

          {activeTenant?.status === "rejected" && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                padding: "6px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <ShieldAlert size={14} />
              <span>Rejected</span>
            </div>
          )}
        </div>

        {view !== "menu" && (
          <AdminNavigation
            title={view === "add-product" ? `Add ${shopConfig?.listingLabel || "Product"}` : view}
            onBack={() => {
              setEditingProduct(null);
              setView("menu");
            }}
          />
        )}

        {/* View: Menu / Dashboard Home */}
        {view === "menu" && (
          <div>
            {/* Status Banners */}
            {activeTenant?.status === "pending_approval" && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(245, 158, 11, 0.05) 100%)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 18,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <Clock size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "#fbbf24" }}>
                    Store Application Under Review
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>
                    Your store application is awaiting platform admin verification. You can configure your store profile and publishing settings below. Adding products and your public storefront will be unlocked once approved.
                  </p>
                </div>
              </div>
            )}

            {activeTenant?.status === "rejected" && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(239, 68, 68, 0.05) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 18,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <ShieldAlert size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: 13.5, fontWeight: 700, color: "#f87171" }}>
                    Store Application Not Approved
                  </h4>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "#cbd5e1", lineHeight: 1.45 }}>
                    Reason: <strong>{activeTenant.rejection_reason || "Store details require revision."}</strong>
                  </p>
                  <button
                    onClick={() => setView("settings")}
                    style={{
                      background: "#2563eb",
                      border: "none",
                      color: "#fff",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Update Store Settings
                  </button>
                </div>
              </div>
            )}

            {/* Analytics Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 18 }}>
              <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>
                  <Package size={16} color="#60a5fa" />
                  <span>Total Products</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {analytics?.totalProducts ?? 0}
                </span>
              </div>

              <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>
                  <ClipboardList size={16} color="#34d399" />
                  <span>Pending Orders</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {analytics?.pendingOrders ?? 0}
                </span>
              </div>

              <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>
                  <CircleAlert size={16} color="#fbbf24" />
                  <span>Low Stock</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  {analytics?.lowStockProducts ?? 0}
                </span>
              </div>

              <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>
                  <DollarSign size={16} color="#a78bfa" />
                  <span>Inventory Value</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                  {formatPrice(analytics?.inventoryValue ?? 0, activeTenant?.currency ?? "ETB")}
                </span>
              </div>
            </div>

            {/* Quick Action Launcher Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <AdminActionCard
                icon={Plus}
                label={`Add ${shopConfig?.listingLabel || "Product"}`}
                description={activeTenant?.status === "active" ? "List an item with photos" : "Locked (Under Review)"}
                onClick={() => {
                  if (activeTenant?.status !== "active") {
                    showToast("error", "Your store must be approved before adding products.");
                    return;
                  }
                  setView("add-product");
                }}
                disabled={activeTenant?.status !== "active"}
              />

              <AdminActionCard
                icon={Package}
                label="Manage Listings"
                description="Edit or delete items"
                onClick={() => setView("products")}
              />

              <AdminActionCard
                icon={ClipboardList}
                label="Customer Orders"
                description="Confirm or fulfill sales"
                onClick={() => setView("orders")}
                badge={analytics?.pendingOrders ?? undefined}
              />

              <AdminActionCard
                icon={Boxes}
                label="Stock & Inventory"
                description={activeTenant?.status === "active" ? "Adjust quantities & costs" : "Locked (Under Review)"}
                onClick={() => {
                  if (activeTenant?.status !== "active") {
                    showToast("error", "Your store must be approved before managing inventory.");
                    return;
                  }
                  router.push(`/admin/inventory?tenant_id=${activeTenant?.id}`);
                }}
                disabled={activeTenant?.status !== "active"}
              />

              <AdminActionCard
                icon={Settings}
                label="Store Settings"
                description="Telegram channels & info"
                onClick={() => setView("settings")}
              />
            </div>
          </div>
        )}

        {/* View: Products List */}
        {view === "products" && (
          <ProductList
            key={listKey}
            mode="manage"
            onEdit={(p) => {
              setEditingProduct(p);
              setView("edit-product");
            }}
          />
        )}

        {/* View: Add Product */}
        {view === "add-product" && (
          <ProductForm
            tenant={activeTenant}
            onSaved={handleProductSaved}
            onCancel={() => setView("menu")}
          />
        )}

        {/* View: Edit Product */}
        {view === "edit-product" && editingProduct && (
          <ProductForm
            product={editingProduct}
            tenant={activeTenant}
            onSaved={handleProductSaved}
            onCancel={() => {
              setEditingProduct(null);
              setView("products");
            }}
          />
        )}

        {/* View: Orders List */}
        {view === "orders" && <OrdersList />}

        {/* View: Requests List */}
        {view === "requests" && <RequestsList />}

        {/* View: Settings */}
        {view === "settings" && <SettingsForm />}
      </div>
    </AdminGate>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0e14", color: "#94a3b8" }}>
          Loading dashboard...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
