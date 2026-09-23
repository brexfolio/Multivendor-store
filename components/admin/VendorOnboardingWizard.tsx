"use client";

import React, { useState, useRef } from "react";
import {
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  Sparkles,
  Share2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { SHOP_TYPE_CONFIGS, ALL_SHOP_TYPES, type ShopType, sanitizeSlug } from "@/lib/shopTypeConfig";
import { apiPost, apiUpload, ApiError } from "@/lib/apiClient";
import { useToast } from "@/components/ui/Toast";
import TelegramImage from "@/components/ui/TelegramImage";
import Button from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { Tenant } from "@/types/tenant";

interface VendorOnboardingWizardProps {
  onCompleted: (tenant: Tenant) => void;
  onCancel?: () => void;
}

export default function VendorOnboardingWizard({ onCompleted, onCancel }: VendorOnboardingWizardProps) {
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [shopType, setShopType] = useState<ShopType>("electronics");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");

  const [telegramChannel, setTelegramChannel] = useState("");
  const [telegramGroup, setTelegramGroup] = useState("");
  const [publishTarget, setPublishTarget] = useState<"channel" | "group" | "both" | "none">("channel");

  const [logoFileId, setLogoFileId] = useState<string | null>(null);
  const [bannerFileId, setBannerFileId] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function handleNameChange(val: string) {
    setName(val);
    if (step <= 2) {
      setSlug(sanitizeSlug(val));
    }
  }

  async function handleFileUpload(file: File, type: "logo" | "banner") {
    if (type === "logo") setIsUploadingLogo(true);
    if (type === "banner") setIsUploadingBanner(true);

    try {
      const fd = new FormData(); fd.append("file", file); const res = await apiUpload<{ file_id: string }>("/api/media/upload", fd);
      if (type === "logo") {
        setLogoFileId(res.file_id);
        showToast("success", "Logo uploaded to Telegram CDN!");
      } else {
        setBannerFileId(res.file_id);
        showToast("success", "Banner uploaded to Telegram CDN!");
      }
    } catch (err: any) {
      showToast("error", err instanceof ApiError ? err.message : "Failed to upload image");
    } finally {
      if (type === "logo") setIsUploadingLogo(false);
      if (type === "banner") setIsUploadingBanner(false);
    }
  }

  async function handleLaunchStore() {
    if (!name.trim()) {
      showToast("error", "Shop name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiPost<{ tenant: Tenant }>("/api/tenants", {
        shop_type: shopType,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        telegram_channel: telegramChannel.trim() || undefined,
        telegram_group: telegramGroup.trim() || undefined,
        publish_target: publishTarget,
        logo_file_id: logoFileId,
        banner_file_id: bannerFileId,
      });

      setCreatedTenant(res.tenant);
      showToast("success", "🎉 Store launched successfully!");
    } catch (err: any) {
      showToast("error", err instanceof ApiError ? err.message : "Failed to create store");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Final Success Screen
  if (createdTenant) {
    const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YegnaSuqqBot";
    const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME || "app";
    const storeDeepLink = `https://t.me/${botUser}/${appName}?startapp=s_${createdTenant.slug}`;

    return (
      <div style={{ padding: "30px 16px", textAlign: "center", color: "#fff" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle2 size={36} color="#34d399" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Congratulations!</h2>
        <p style={{ fontSize: 14, color: "#94a3b8", margin: "0 0 24px" }}>
          Your store <strong>{createdTenant.name}</strong> is live on Telegram.
        </p>

        <div style={{ background: "#161b26", borderRadius: 14, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 24, textAlign: "left" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase" }}>Your Store Deep Link</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <input
              readOnly
              value={storeDeepLink}
              style={{ flex: 1, background: "#1f293d", border: "none", color: "#fff", padding: "8px 10px", borderRadius: 8, fontSize: 12 }}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(storeDeepLink);
                showToast("success", "Deep link copied!");
              }}
              style={{ background: "#2563eb", border: "none", color: "#fff", padding: "8px 12px", borderRadius: 8, cursor: "pointer" }}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>

        <Button onClick={() => onCompleted(createdTenant)} style={{ width: "100%", height: 48, fontSize: 15 }}>
          Go to Vendor Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Progress Indicators */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Step {step} of 5
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                width: 22,
                height: 4,
                borderRadius: 2,
                background: s <= step ? "#3b82f6" : "#222c3d",
              }}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Select Shop Category */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
            Choose Your Shop Category
          </h2>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px" }}>
            This customizes your listing forms, customer card layouts, and search filters.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
            {ALL_SHOP_TYPES.map((typeKey) => {
              const cfg = SHOP_TYPE_CONFIGS[typeKey];
              const isSelected = shopType === typeKey;
              return (
                <div
                  key={typeKey}
                  onClick={() => setShopType(typeKey)}
                  style={{
                    background: isSelected ? "rgba(59, 130, 246, 0.15)" : "#161b26",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14,
                    padding: 12,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{cfg.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#60a5fa" : "#fff" }}>
                    {cfg.label.split(" ")[0]}
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={() => setStep(2)} style={{ width: "100%", height: 46 }}>
            Next: Store Details
          </Button>
        </div>
      )}

      {/* Step 2: Store Details */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
              Store Identity
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              What is your business name and custom handle?
            </p>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Store Name *
            </label>
            <Input
              type="text"
              placeholder="e.g. Addis Tech Hub"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Custom Handle (Slug) *
            </label>
            <Input
              type="text"
              placeholder="e.g. addis-tech-hub"
              value={slug}
              onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
              required
            />
            <span style={{ fontSize: 11, color: "#64748b", marginTop: 4, display: "block" }}>
              Store link: t.me/YegnaSuqqBot/app?startapp=s_{slug || "your-handle"}
            </span>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Contact Phone Number
            </label>
            <Input
              type="tel"
              placeholder="e.g. 0911223344"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Store Description
            </label>
            <Textarea
              placeholder="Tell customers about your products, warranty, and location..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Button variant="secondary" onClick={() => setStep(1)} style={{ flex: 1, height: 46 }}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!name.trim() || !slug.trim()} style={{ flex: 2, height: 46 }}>
              Next: Telegram Setup
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Telegram Publishing */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
              Telegram Auto-Posting
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              Optionally connect your public channel so new products post automatically.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Public Channel Username (@handle)
            </label>
            <Input
              type="text"
              placeholder="e.g. @my_electronics_channel"
              value={telegramChannel}
              onChange={(e) => setTelegramChannel(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Publishing Preference
            </label>
            <select
              value={publishTarget}
              onChange={(e) => setPublishTarget(e.target.value as any)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: "#161b26",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "0 12px",
                fontSize: 13,
              }}
            >
              <option value="channel">Publish to Telegram Channel</option>
              <option value="group">Publish to Telegram Group / Forum Topic</option>
              <option value="both">Publish to Both</option>
              <option value="none">Manual / Do Not Auto-Publish</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Button variant="secondary" onClick={() => setStep(2)} style={{ flex: 1, height: 46 }}>
              Back
            </Button>
            <Button onClick={() => setStep(4)} style={{ flex: 2, height: 46 }}>
              Next: Branding
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Logo & Banner */}
      {step === 4 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
              Upload Branding
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              Photos are stored directly on Telegram CDN.
            </p>
          </div>

          {/* Logo Upload */}
          <div style={{ background: "#161b26", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "block", marginBottom: 8 }}>
              Store Logo
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 64, height: 64, borderRadius: 14, overflow: "hidden", background: "#1e293b" }}>
                <TelegramImage fileId={logoFileId} alt="Logo" fallbackIcon={<Store size={28} color="#60a5fa" />} />
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, "logo");
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isUploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  style={{ fontSize: 12, height: 36 }}
                >
                  <Upload size={14} style={{ marginRight: 6 }} />
                  {isUploadingLogo ? "Uploading..." : logoFileId ? "Change Logo" : "Upload Logo"}
                </Button>
              </div>
            </div>
          </div>

          {/* Banner Upload */}
          <div style={{ background: "#161b26", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "block", marginBottom: 8 }}>
              Cover Banner (Optional)
            </span>
            <div style={{ width: "100%", height: 90, borderRadius: 10, overflow: "hidden", background: "#1e293b", marginBottom: 10 }}>
              <TelegramImage fileId={bannerFileId} alt="Banner" fallbackIcon={<div style={{ color: "#64748b", fontSize: 12 }}>No banner selected</div>} />
            </div>
            <input
              type="file"
              accept="image/*"
              ref={bannerInputRef}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f, "banner");
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isUploadingBanner}
              onClick={() => bannerInputRef.current?.click()}
              style={{ fontSize: 12, height: 36 }}
            >
              <Upload size={14} style={{ marginRight: 6 }} />
              {isUploadingBanner ? "Uploading..." : bannerFileId ? "Change Banner" : "Upload Banner"}
            </Button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setStep(3)} style={{ flex: 1, height: 46 }}>
              Back
            </Button>
            <Button onClick={() => setStep(5)} style={{ flex: 2, height: 46 }}>
              Next: Review
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Confirmation */}
      {step === 5 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 6px" }}>
              Ready to Launch!
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
              Review your shop details before creating it.
            </p>
          </div>

          {/* Store Preview Card */}
          <div style={{ background: "#161b26", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", background: "#1e293b" }}>
                <TelegramImage fileId={logoFileId} alt={name} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#fff" }}>{name}</h3>
                <span style={{ fontSize: 12, color: "#60a5fa" }}>
                  {SHOP_TYPE_CONFIGS[shopType].icon} {SHOP_TYPE_CONFIGS[shopType].label}
                </span>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "#94a3b8" }}>
              <div>Handle: <strong style={{ color: "#fff" }}>{slug}</strong></div>
              {phone && <div>Phone: <strong style={{ color: "#fff" }}>{phone}</strong></div>}
              {telegramChannel && <div>Channel: <strong style={{ color: "#fff" }}>{telegramChannel}</strong></div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <Button variant="secondary" onClick={() => setStep(4)} style={{ flex: 1, height: 48 }}>
              Back
            </Button>
            <Button onClick={handleLaunchStore} disabled={isSubmitting} style={{ flex: 2, height: 48, background: "#2563eb", fontSize: 15, fontWeight: 700 }}>
              {isSubmitting ? "Provisioning Shop..." : "🚀 Launch My Store"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}