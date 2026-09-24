"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  Store,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertTriangle,
  Send,
  X,
  Phone,
} from "lucide-react";
import AdminGate from "@/components/admin/AdminGate";
import TelegramImage from "@/components/ui/TelegramImage";
import { useToast } from "@/components/ui/Toast";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { SHOP_TYPE_CONFIGS } from "@/lib/shopTypeConfig";
import { formatDate } from "@/lib/utils";
import type { Tenant, TenantStatus } from "@/types/tenant";

type StatusTab = "all" | "pending_approval" | "active" | "rejected" | "suspended";

export default function SuperAdminPage() {
  const { showToast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject Modal state
  const [rejectingStore, setRejectingStore] = useState<Tenant | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  function loadAllStores() {
    setIsLoading(true);
    apiGet<{ tenants: Tenant[] }>("/api/tenants?admin=true")
      .then((data) => setTenants(data.tenants || []))
      .catch((err) => {
        console.error("Failed to load stores:", err);
        setTenants([]);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadAllStores();
  }, []);

  async function handleStatusChange(
    tenantId: string,
    newStatus: TenantStatus,
    reason?: string
  ) {
    setActionLoadingId(tenantId);
    try {
      const res = await apiPatch<{ tenant: Tenant }>(`/api/admin/tenants/${tenantId}/status`, {
        status: newStatus,
        rejection_reason: reason,
      });

      setTenants((prev) =>
        prev.map((t) => (t.id === tenantId ? { ...t, ...res.tenant } : t))
      );

      if (newStatus === "active") {
        showToast("success", "Store approved! Owner has been notified on Telegram.");
      } else if (newStatus === "rejected") {
        showToast("success", "Store application rejected. Owner notified on Telegram.");
      } else if (newStatus === "suspended") {
        showToast("success", "Store suspended.");
      }
    } catch (err: any) {
      showToast("error", err?.message || "Failed to update store status");
    } finally {
      setActionLoadingId(null);
      setRejectingStore(null);
      setRejectionReason("");
    }
  }

  // Filtered list
  const filteredTenants = tenants.filter((store) => {
    if (filterTab !== "all" && store.status !== filterTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = store.name.toLowerCase().includes(q);
      const matchSlug = store.slug.toLowerCase().includes(q);
      const matchOwner = store.owner_telegram_id.includes(q);
      if (!matchName && !matchSlug && !matchOwner) return false;
    }
    return true;
  });

  const pendingCount = tenants.filter((t) => t.status === "pending_approval").length;
  const activeCount = tenants.filter((t) => t.status === "active").length;
  const rejectedCount = tenants.filter((t) => t.status === "rejected").length;
  const suspendedCount = tenants.filter((t) => t.status === "suspended").length;

  return (
    <AdminGate>
      <div className="admin-shell" style={{ maxWidth: 860, margin: "0 auto", paddingBottom: 60 }}>
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.1) 100%)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={24} color="#60a5fa" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
                Yegna Suqq (የኛ ሱቅ) Super-Admin
              </h1>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                Store approvals, marketplace directory & moderation
              </p>
            </div>
          </div>

          <button
            onClick={loadAllStores}
            style={{
              background: "#161b26",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
            }}
          >
            <RefreshCw size={14} className={isLoading ? "spin-animation" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
          <div
            onClick={() => setFilterTab("pending_approval")}
            style={{
              background: filterTab === "pending_approval" ? "rgba(245, 158, 11, 0.12)" : "#161b26",
              borderRadius: 14,
              padding: 12,
              border: filterTab === "pending_approval" ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={14} color="#fbbf24" />
              <span style={{ fontSize: 11.5, color: "#fbbf24", fontWeight: 700 }}>Pending Review</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fbbf24", margin: "4px 0 0" }}>
              {pendingCount}
            </p>
          </div>

          <div
            onClick={() => setFilterTab("active")}
            style={{
              background: filterTab === "active" ? "rgba(16, 185, 129, 0.12)" : "#161b26",
              borderRadius: 14,
              padding: 12,
              border: filterTab === "active" ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} color="#34d399" />
              <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Active Stores</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#34d399", margin: "4px 0 0" }}>
              {activeCount}
            </p>
          </div>

          <div
            onClick={() => setFilterTab("rejected")}
            style={{
              background: filterTab === "rejected" ? "rgba(239, 68, 68, 0.12)" : "#161b26",
              borderRadius: 14,
              padding: 12,
              border: filterTab === "rejected" ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <XCircle size={14} color="#f87171" />
              <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Rejected</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#f87171", margin: "4px 0 0" }}>
              {rejectedCount}
            </p>
          </div>

          <div
            onClick={() => setFilterTab("all")}
            style={{
              background: filterTab === "all" ? "rgba(59, 130, 246, 0.12)" : "#161b26",
              borderRadius: 14,
              padding: 12,
              border: filterTab === "all" ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid rgba(255,255,255,0.06)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Store size={14} color="#60a5fa" />
              <span style={{ fontSize: 11.5, color: "#94a3b8" }}>Total Stores</span>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "4px 0 0" }}>
              {tenants.length}
            </p>
          </div>
        </div>

        {/* Filter Navigation Tabs & Search */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {(
              [
                { id: "all", label: `All (${tenants.length})` },
                { id: "pending_approval", label: `Pending Review (${pendingCount})`, badge: pendingCount > 0 },
                { id: "active", label: `Active (${activeCount})` },
                { id: "rejected", label: `Rejected (${rejectedCount})` },
                { id: "suspended", label: `Suspended (${suspendedCount})` },
              ] as const
            ).map((tab) => {
              const isSelected = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    background: isSelected
                      ? tab.id === "pending_approval"
                        ? "#f59e0b"
                        : "#2563eb"
                      : "#161b26",
                    color: isSelected ? "#fff" : "#94a3b8",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div style={{ position: "relative" }}>
            <Search size={15} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search store name, handle slug, or owner ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "#161b26",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                padding: "8px 12px 8px 36px",
                color: "#fff",
                fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Stores List */}
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading marketplace stores...</div>
        ) : filteredTenants.length === 0 ? (
          <div style={{ padding: 36, textAlign: "center", background: "#161b26", borderRadius: 14, color: "#94a3b8" }}>
            No stores match the selected filter.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredTenants.map((store) => {
              const cfg = SHOP_TYPE_CONFIGS[store.shop_type] || SHOP_TYPE_CONFIGS.other;
              const isActionLoading = actionLoadingId === store.id;

              return (
                <div
                  key={store.id}
                  style={{
                    background: "#161b26",
                    borderRadius: 16,
                    padding: 16,
                    border:
                      store.status === "pending_approval"
                        ? "1px solid rgba(245, 158, 11, 0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {/* Store Header Row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#1e293b",
                          flexShrink: 0,
                        }}
                      >
                        <TelegramImage
                          fileId={store.logo_file_id}
                          alt={store.name}
                          fallbackIcon={<Store size={24} color="#60a5fa" />}
                        />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>
                            {store.name}
                          </h3>
                          <span
                            style={{
                              fontSize: 11,
                              background: "rgba(59,130,246,0.15)",
                              color: "#60a5fa",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {cfg.icon} {cfg.label.split(" ")[0]}
                          </span>
                        </div>

                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>
                          Handle: <code>s_{store.slug}</code> • Owner Telegram ID: <code>{store.owner_telegram_id}</code>
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {store.status === "pending_approval" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Clock size={12} />
                          Pending Review
                        </span>
                      )}

                      {store.status === "active" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#34d399",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Active
                        </span>
                      )}

                      {store.status === "rejected" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#f87171",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <XCircle size={12} />
                          Rejected
                        </span>
                      )}

                      {store.status === "suspended" && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "rgba(148, 163, 184, 0.15)",
                            color: "#94a3b8",
                          }}
                        >
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Store Details Snippet */}
                  <div
                    style={{
                      background: "#121722",
                      borderRadius: 10,
                      padding: 10,
                      fontSize: 12,
                      color: "#94a3b8",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {store.description && (
                      <p style={{ margin: 0, color: "#cbd5e1" }}>{store.description}</p>
                    )}

                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
                      {store.contact_phone && (
                        <span>
                          📞 Phone: <strong style={{ color: "#fff" }}>{store.contact_phone}</strong>
                        </span>
                      )}
                      {store.telegram_channel && (
                        <span>
                          📢 Channel: <strong style={{ color: "#60a5fa" }}>{store.telegram_channel}</strong>
                        </span>
                      )}
                      <span>
                        📅 Applied: <strong style={{ color: "#cbd5e1" }}>{formatDate(store.created_at)}</strong>
                      </span>
                    </div>

                    {store.status === "rejected" && store.rejection_reason && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: 8,
                          borderRadius: 6,
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#f87171",
                          fontSize: 11.5,
                        }}
                      >
                        <strong>Rejection Reason:</strong> {store.rejection_reason}
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                      paddingTop: 10,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        href={`/s/${store.slug}`}
                        target="_blank"
                        style={{
                          background: "#1e293b",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          color: "#38bdf8",
                          fontSize: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          textDecoration: "none",
                        }}
                      >
                        <span>Preview Storefront</span>
                        <ExternalLink size={13} />
                      </Link>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {store.status === "pending_approval" && (
                        <>
                          <button
                            disabled={isActionLoading}
                            onClick={() => {
                              setRejectingStore(store);
                              setRejectionReason("");
                            }}
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              color: "#f87171",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isActionLoading ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <XCircle size={14} />
                            <span>Reject</span>
                          </button>

                          <button
                            disabled={isActionLoading}
                            onClick={() => handleStatusChange(store.id, "active")}
                            style={{
                              background: "#059669",
                              border: "none",
                              color: "#fff",
                              borderRadius: 8,
                              padding: "7px 16px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: isActionLoading ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <CheckCircle2 size={14} />
                            <span>{isActionLoading ? "Approving..." : "Approve Store"}</span>
                          </button>
                        </>
                      )}

                      {store.status === "active" && (
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleStatusChange(store.id, "suspended")}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.25)",
                            color: "#f87171",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Suspend Store
                        </button>
                      )}

                      {(store.status === "rejected" || store.status === "suspended") && (
                        <button
                          disabled={isActionLoading}
                          onClick={() => handleStatusChange(store.id, "active")}
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            color: "#34d399",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <CheckCircle2 size={13} />
                          <span>Re-Approve Store</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rejection Modal Dialog */}
        {rejectingStore && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              style={{
                background: "#161b26",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16,
                padding: 20,
                maxWidth: 440,
                width: "100%",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                  Reject Store Application
                </h3>
                <button
                  onClick={() => setRejectingStore(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 14px", lineHeight: 1.5 }}>
                Provide a reason for rejecting <strong>{rejectingStore.name}</strong>. The owner will be notified with this message on Telegram.
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Inappropriate category selected, invalid phone number, or please verify shop identity..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0d1117",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: 10,
                  color: "#fff",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  marginBottom: 16,
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => setRejectingStore(null)}
                  style={{
                    background: "none",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    padding: "8px 14px",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={() =>
                    handleStatusChange(
                      rejectingStore.id,
                      "rejected",
                      rejectionReason.trim() || "Store details require revision."
                    )
                  }
                  style={{
                    background: "#dc2626",
                    border: "none",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGate>
  );
}