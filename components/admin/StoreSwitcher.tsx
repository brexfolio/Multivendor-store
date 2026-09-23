"use client";

import React, { useState } from "react";
import { ChevronDown, Plus, Store, Check } from "lucide-react";
import { SHOP_TYPE_CONFIGS } from "@/lib/shopTypeConfig";
import TelegramImage from "@/components/ui/TelegramImage";
import Modal from "@/components/ui/Modal";
import type { Tenant } from "@/types/tenant";

interface StoreSwitcherProps {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  onSelectTenant: (tenant: Tenant) => void;
  onOpenCreateNew: () => void;
}

export default function StoreSwitcher({
  currentTenant,
  tenants,
  onSelectTenant,
  onOpenCreateNew,
}: StoreSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentConfig = currentTenant
    ? SHOP_TYPE_CONFIGS[currentTenant.shop_type] || SHOP_TYPE_CONFIGS.other
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#161b26",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 12,
          padding: "8px 12px",
          color: "#fff",
          cursor: "pointer",
          width: "100%",
          maxWidth: 320,
          textAlign: "left",
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", background: "#1e293b", flexShrink: 0 }}>
          <TelegramImage fileId={currentTenant?.logo_file_id} alt="Logo" fallbackIcon={<Store size={18} color="#60a5fa" />} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentTenant?.name || "Select Store"}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
            {currentConfig ? `${currentConfig.icon} ${currentConfig.label.split(" ")[0]}` : "Manage Stores"}
          </p>
        </div>
        <ChevronDown size={16} color="#94a3b8" />
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Switch Store Context">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "6px 0" }}>
          {tenants.map((t) => {
            const isSelected = currentTenant?.id === t.id;
            const cfg = SHOP_TYPE_CONFIGS[t.shop_type] || SHOP_TYPE_CONFIGS.other;
            return (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTenant(t);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 12,
                  borderRadius: 12,
                  background: isSelected ? "rgba(59, 130, 246, 0.15)" : "#161b26",
                  border: isSelected ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", background: "#1e293b" }}>
                    <TelegramImage fileId={t.logo_file_id} alt={t.name} fallbackIcon={<Store size={18} color="#60a5fa" />} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#fff" }}>{t.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{cfg.icon} {cfg.label}</p>
                  </div>
                </div>
                {isSelected && <Check size={18} color="#60a5fa" />}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenCreateNew();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: 12,
              borderRadius: 12,
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px dashed rgba(56, 189, 248, 0.4)",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              marginTop: 6,
            }}
          >
            <Plus size={16} />
            <span>Launch Another Store</span>
          </button>
        </div>
      </Modal>
    </>
  );
}