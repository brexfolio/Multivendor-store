"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, ImagePlus, ArrowUp, ArrowDown, Star, X, Sparkles } from "lucide-react";
import {
  PRODUCT_CONDITIONS,
  PRODUCT_AVAILABILITIES,
  type Product,
  type ProductCondition,
  type ProductAvailability,
} from "@/types/product";
import { getShopTypeConfig, FIELD_DEFINITIONS } from "@/lib/shopTypeConfig";
import { Input, Textarea } from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { apiPost, apiPatch, apiUpload, ApiError } from "@/lib/apiClient";
import TelegramImage from "@/components/ui/TelegramImage";
import type { Tenant } from "@/types/tenant";

interface ImageDraft {
  file_id: string;
  preview_url?: string;
}

interface ProductFormProps {
  product?: Product;
  tenant?: Tenant | null;
  onSaved: (product: Product, channelWarning: string | null) => void;
  onCancel: () => void;
}

export default function ProductForm({ product, tenant, onSaved, onCancel }: ProductFormProps) {
  const isEditing = Boolean(product);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shopType = tenant?.shop_type || (product?.tenant as any)?.shop_type || "electronics";
  const config = getShopTypeConfig(shopType);

  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? config.label.split(" ")[0]);
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [condition, setCondition] = useState<ProductCondition>(product?.condition ?? "Brand New");
  const [description, setDescription] = useState(product?.description ?? "");
  const [availability, setAvailability] = useState<ProductAvailability>(
    product?.availability ?? "Available"
  );
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [publishTarget, setPublishTarget] = useState<string>(product?.publish_target ?? "default");

  // Dynamic Metadata state
  const [metadata, setMetadata] = useState<Record<string, any>>(product?.metadata ?? {});

  // Image file_ids (Pure Telegram CDN)
  const [imageFileIds, setImageFileIds] = useState<string[]>(
    product?.image_file_ids && product.image_file_ids.length > 0
      ? product.image_file_ids
      : (product?.images ?? []).map((img) => img.telegram_file_id || "").filter(Boolean)
  );

  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setError(null);

    const newIds: string[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData(); fd.append("file", files[i]); const res = await apiUpload<{ file_id: string }>("/api/media/upload", fd);
        if (res.file_id) newIds.push(res.file_id);
      } catch (err: any) {
        setError(err instanceof ApiError ? err.message : "Failed to upload some images");
      }
    }

    if (newIds.length > 0) {
      setImageFileIds((prev) => [...prev, ...newIds]);
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(index: number) {
    setImageFileIds((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImageFileIds((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function handleMetaFieldChange(fieldName: string, value: any) {
    setMetadata((prev) => ({ ...prev, [fieldName]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        tenant_id: tenant?.id || product?.tenant_id,
        name: name.trim(),
        category: category.trim(),
        price: numericPrice,
        condition,
        description: description.trim(),
        availability,
        featured,
        publish_target: publishTarget === "default" ? null : publishTarget,
        metadata,
        image_file_ids: imageFileIds,
      };

      if (isEditing && product) {
        const res = await apiPatch<{ product: Product; channelWarning: string | null }>(
          `/api/products/${product.id}`,
          payload
        );
        onSaved(res.product, res.channelWarning);
      } else {
        const res = await apiPost<{ product: Product; channelWarning: string | null }>(
          "/api/products",
          payload
        );
        onSaved(res.product, res.channelWarning);
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="admin-form" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(59, 130, 246, 0.1)", padding: "10px 14px", borderRadius: 10 }}>
        <span style={{ fontSize: 20 }}>{config.icon}</span>
        <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 700 }}>
          {config.label} Listing Form
        </span>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", padding: 12, borderRadius: 10, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Basic Product Info */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
          {config.listingLabel} Title *
        </label>
        <Input
          type="text"
          placeholder={`e.g. ${config.productFields.includes("brand") ? "Nike Air Max / iPhone 15" : "Product Name"}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
            Price (ETB) *
          </label>
          <Input
            type="number"
            step="0.01"
            min="1"
            placeholder="e.g. 2500"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
            Condition
          </label>
          <Select
            value={condition}
            onChange={(val) => setCondition(val as ProductCondition)}
            options={PRODUCT_CONDITIONS.map((c) => ({ value: c, label: c }))}
          />
        </div>
      </div>

      {/* Dynamic Fields tailored to this shop_type */}
      {config.productFields.length > 0 && (
        <div style={{ background: "#161b26", borderRadius: 14, padding: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Sparkles size={15} color="#38bdf8" />
            <span>{config.label} Attributes</span>
          </span>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {config.productFields.map((fieldName) => {
              const def = FIELD_DEFINITIONS[fieldName];
              if (!def) return null;

              if (def.type === "select" && def.options) {
                return (
                  <div key={fieldName}>
                    <label style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                      {def.label}
                    </label>
                    <select
                      value={metadata[fieldName] ?? ""}
                      onChange={(e) => handleMetaFieldChange(fieldName, e.target.value)}
                      style={{
                        width: "100%",
                        height: 42,
                        borderRadius: 8,
                        background: "#1e293b",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "0 10px",
                        fontSize: 13,
                      }}
                    >
                      <option value="">Select {def.label}...</option>
                      {def.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={fieldName}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                    {def.label}
                  </label>
                  <Input
                    type={def.type === "number" ? "number" : "text"}
                    placeholder={def.placeholder || `Enter ${def.label}...`}
                    value={metadata[fieldName] ?? ""}
                    onChange={(e) => handleMetaFieldChange(fieldName, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
          Description
        </label>
        <Textarea
          placeholder="Details, dimensions, warranty, or delivery instructions..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Telegram CDN Photos */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>
            Photos (Telegram CDN) ({imageFileIds.length})
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            style={{ fontSize: 12, height: 34 }}
          >
            <ImagePlus size={15} style={{ marginRight: 6 }} />
            {isUploading ? "Uploading to Telegram..." : "Add Photos"}
          </Button>
        </div>

        {imageFileIds.length > 0 && (
          <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "6px 0" }}>
            {imageFileIds.map((fId, index) => (
              <div
                key={fId + index}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#1e293b",
                  position: "relative",
                  flexShrink: 0,
                  border: index === 0 ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <TelegramImage fileId={fId} alt="Product image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    background: "rgba(0,0,0,0.7)",
                    border: "none",
                    borderRadius: "50%",
                    width: 20,
                    height: 20,
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock & Featured Toggles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
            Availability
          </label>
          <Select
            value={availability}
            onChange={(val) => setAvailability(val as ProductAvailability)}
            options={PRODUCT_AVAILABILITIES.map((a) => ({ value: a, label: a }))}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
            Telegram Auto-Post
          </label>
          <select
            value={publishTarget}
            onChange={(e) => setPublishTarget(e.target.value)}
            style={{
              width: "100%",
              height: 42,
              borderRadius: 8,
              background: "#161b26",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "0 10px",
              fontSize: 13,
            }}
          >
            <option value="default">Use Store Default</option>
            <option value="channel">Channel Only</option>
            <option value="group">Group Only</option>
            <option value="both">Both</option>
            <option value="none">Do Not Publish</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <Button type="button" variant="secondary" onClick={onCancel} style={{ flex: 1, height: 46 }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || isUploading} style={{ flex: 2, height: 46 }}>
          {isSaving ? "Saving..." : isEditing ? "Update Product" : "Publish Product"}
        </Button>
      </div>
    </form>
  );
}