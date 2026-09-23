"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Store, Package, ShoppingBag, ExternalLink, RefreshCw } from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import TelegramImage from "@/components/ui/TelegramImage";
import { apiGet } from "@/lib/apiClient";
import { SHOP_TYPE_CONFIGS } from "@/lib/shopTypeConfig";
import { formatDate } from "@/lib/utils";
import type { Tenant } from "@/types/tenant";

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function loadAllStores() {
    setIsLoading(true);
    apiGet<{ tenants: Tenant[] }>("/api/tenants")
      .then((data) => setTenants(data.tenants || []))
      .catch(() => setTenants([]))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadAllStores();
  }, []);

  return (
    <AdminGate>
      <div className="admin-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(59, 130, 246, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={22} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>Yegna Suqq (የኛ ሱቅ) Admin</h1>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Super-admin global marketplace oversight</p>
            </div>
          </div>

          <button
            onClick={loadAllStores}
            style={{ background: "#161b26", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Total Stores</span>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "4px 0 0" }}>{tenants.length}</p>
          </div>
          <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Active Stores</span>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#34d399", margin: "4px 0 0" }}>
              {tenants.filter((t) => t.status === "active").length}
            </p>
          </div>
          <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Categories</span>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa", margin: "4px 0 0" }}>9</p>
          </div>
        </div>

        {/* Stores Directory List */}
        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>Registered Stores</h2>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading stores...</div>
        ) : tenants.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", background: "#161b26", borderRadius: 12, color: "#94a3b8" }}>
            No stores registered yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tenants.map((store) => {
              const cfg = SHOP_TYPE_CONFIGS[store.shop_type] || SHOP_TYPE_CONFIGS.other;
              return (
                <div
                  key={store.id}
                  style={{
                    background: "#161b26",
                    borderRadius: 14,
                    padding: 14,
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, overflow: "hidden", background: "#1e293b", flexShrink: 0 }}>
                      <TelegramImage fileId={store.logo_file_id} alt={store.name} fallbackIcon={<Store size={22} color="#60a5fa" />} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>{store.name}</h3>
                        <span style={{ fontSize: 11, background: "rgba(59,130,246,0.15)", color: "#60a5fa", padding: "1px 6px", borderRadius: 4 }}>
                          {cfg.icon} {cfg.label.split(" ")[0]}
                        </span>
                      </div>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#94a3b8" }}>
                        Handle: <code>s_{store.slug}</code> • Owner: <code>{store.owner_telegram_id}</code>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: store.status === "active" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                        color: store.status === "active" ? "#34d399" : "#f87171",
                      }}
                    >
                      {store.status}
                    </span>
                    <Link
                      href={`/s/${store.slug}`}
                      target="_blank"
                      style={{
                        background: "#1e293b",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        color: "#38bdf8",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminGate>
  );
}