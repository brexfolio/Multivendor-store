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

  const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "HabentechBot";
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

          {storeLink && (
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
                description="List an item with photos"
                onClick={() => setView("add-product")}
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
                description="Adjust quantities & costs"
                onClick={() => router.push(`/admin/inventory?tenant_id=${activeTenant?.id}`)}
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
