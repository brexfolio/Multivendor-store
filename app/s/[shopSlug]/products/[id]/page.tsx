"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Share2,
  ShoppingCart,
  MessageCircle,
  Phone,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Truck,
  Store,
} from "lucide-react";
import Header from "@/components/store/Header";
import TelegramImage from "@/components/ui/TelegramImage";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useTelegramUser } from "@/lib/useTelegramUser";
import { formatPrice } from "@/lib/utils";
import { apiGet, apiPost, ApiError } from "@/lib/apiClient";
import { FIELD_DEFINITIONS } from "@/lib/shopTypeConfig";
import type { Product } from "@/types/product";

export default function ProductDetailPage() {
  const params = useParams<{ shopSlug: string; id: string }>();
  const router = useRouter();
  const { user } = useTelegramUser();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    setIsLoading(true);

    apiGet<{ product: Product }>(`/api/products/${params.id}`)
      .then((data) => setProduct(data.product))
      .catch(() => setProduct(null))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const allFileIds = useMemo(() => {
    if (!product) return [];
    if (product.image_file_ids && product.image_file_ids.length > 0) {
      return product.image_file_ids;
    }
    return (product.images || []).map((img) => img.telegram_file_id || img.image_url).filter(Boolean);
  }, [product]);

  const metadataList = useMemo(() => {
    if (!product?.metadata) return [];
    return Object.entries(product.metadata).filter(([_, v]) => v !== undefined && v !== null && v !== "");
  }, [product]);

  const deepLink = useMemo(() => {
    const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YegnaSuqqBot";
    const appName = process.env.NEXT_PUBLIC_TELEGRAM_APP_NAME || "app";
    return `https://t.me/${botUser}/${appName}?startapp=s_${params.shopSlug}_p_${params.id}`;
  }, [params.shopSlug, params.id]);

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    if (!phone.trim()) {
      showToast("error", "Please provide a contact phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiPost("/api/orders", {
        product_id: product.id,
        quantity,
        customer_phone: phone.trim(),
        delivery_address: address.trim(),
      });

      showToast("success", "Order sent to vendor successfully!");
      setShowOrderModal(false);
      router.push(`/s/${params.shopSlug}/orders`);
    } catch (err: any) {
      showToast("error", err instanceof ApiError ? err.message : "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="store-shell" style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="store-shell" style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
        <h2>Product not found</h2>
        <Link href={`/s/${params.shopSlug}`}>Back to store</Link>
      </div>
    );
  }

  const isAvailable = product.availability === "Available" || product.availability === "Low Stock";

  return (
    <div className="store-shell" style={{ paddingBottom: 90 }}>
      <Header />

      {/* Top Navigation Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 12 }}>
        <Link
          href={`/s/${params.shopSlug}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#94a3b8", textDecoration: "none", fontSize: 13, fontWeight: 600 }}
        >
          <ArrowLeft size={16} />
          <span>Back to Store</span>
        </Link>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: product.name, url: deepLink }).catch(() => {});
            } else {
              navigator.clipboard.writeText(deepLink);
              showToast("success", "Link copied!");
            }
          }}
          style={{ background: "#161b26", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#fff", padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12 }}
        >
          <Share2 size={14} />
          <span>Share</span>
        </button>
      </div>

      {/* Image Gallery */}
      <div style={{ background: "#161b26", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
        <div style={{ width: "100%", height: 280, background: "#1e293b", position: "relative" }}>
          <TelegramImage
            fileId={allFileIds[activeImageIndex]}
            alt={product.name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {allFileIds.length > 1 && (
            <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
              {allFileIds.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: idx === activeImageIndex ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: idx === activeImageIndex ? "#38bdf8" : "rgba(255,255,255,0.4)",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {allFileIds.length > 1 && (
          <div style={{ display: "flex", gap: 8, padding: 12, overflowX: "auto" }}>
            {allFileIds.map((fId, idx) => (
              <div
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: idx === activeImageIndex ? "2px solid #38bdf8" : "2px solid transparent",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <TelegramImage fileId={fId} alt={`Thumb ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price & Name Header */}
      <div style={{ background: "#161b26", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#38bdf8" }}>
            {formatPrice(product.price, product.currency)}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 6,
              background: isAvailable ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: isAvailable ? "#34d399" : "#f87171",
            }}
          >
            {product.availability}
          </span>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 10px", lineHeight: 1.3 }}>
          {product.name}
        </h1>

        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#94a3b8" }}>
          <span>Category: <strong style={{ color: "#cbd5e1" }}>{product.category}</strong></span>
          {product.condition && <span>Condition: <strong style={{ color: "#cbd5e1" }}>{product.condition}</strong></span>}
        </div>
      </div>

      {/* Dynamic Metadata Attributes */}
      {metadataList.length > 0 && (
        <div style={{ background: "#161b26", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>Product Specifications</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {metadataList.map(([key, val]) => {
              const def = FIELD_DEFINITIONS[key];
              const label = def?.label || key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div key={key} style={{ background: "#1f293d", borderRadius: 8, padding: 10 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 11, color: "#94a3b8" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>{String(val)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      {product.description && (
        <div style={{ background: "#161b26", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>Description</h3>
          <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {product.description}
          </p>
        </div>
      )}

      {/* Bottom Sticky Action Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#0f172a",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "12px 16px",
          display: "flex",
          gap: 12,
          zIndex: 100,
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        <button
          disabled={!isAvailable}
          onClick={() => setShowOrderModal(true)}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            background: isAvailable ? "#2563eb" : "#334155",
            color: "#fff",
            border: "none",
            fontSize: 15,
            fontWeight: 700,
            cursor: isAvailable ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <ShoppingCart size={18} />
          <span>{isAvailable ? "Order Now" : "Out of Stock"}</span>
        </button>
      </div>

      {/* Order Placement Modal */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title={`Order ${product.name}`}
      >
        <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Quantity
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{ width: 36, height: 36, borderRadius: 8, background: "#1e293b", color: "#fff", border: "none", fontSize: 18, cursor: "pointer" }}
              >
                -
              </button>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                style={{ width: 36, height: 36, borderRadius: 8, background: "#1e293b", color: "#fff", border: "none", fontSize: 18, cursor: "pointer" }}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Contact Phone Number *
            </label>
            <Input
              type="tel"
              placeholder="e.g. 0911223344"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Delivery Address / Pickup Notes (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. Bole, near Edna Mall, Addis Ababa"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div style={{ background: "#1e293b", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>Total Price:</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>
              {formatPrice(product.price * quantity, product.currency)}
            </span>
          </div>

          <Button type="submit" disabled={isSubmitting} style={{ height: 46, fontSize: 14 }}>
            {isSubmitting ? "Sending Order..." : "Confirm & Send Order"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}