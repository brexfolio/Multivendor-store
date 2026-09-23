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
  Sparkles,
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
        customer_name: user?.first_name || "Customer",
        telegram_user_id: user ? String(user.id) : null,
      });

      showToast("success", "Order placed! The store owner has been notified.");
      setShowOrderModal(false);
      router.push(`/s/${params.shopSlug}/orders`);
    } catch (err: any) {
      showToast("error", err instanceof ApiError ? err.message : "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="store-shell" style={{ background: "#0a0d14", minHeight: "100vh", padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading product...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="store-shell" style={{ background: "#0a0d14", minHeight: "100vh", padding: 40, textAlign: "center", color: "#94a3b8" }}>
        <h2>Product not found</h2>
        <Link href={`/s/${params.shopSlug}`} style={{ color: "#38bdf8", textDecoration: "none" }}>
          Back to store
        </Link>
      </div>
    );
  }

  const isAvailable = product.availability === "Available" || product.availability === "Low Stock";

  return (
    <div className="store-shell" style={{ background: "#0a0d14", minHeight: "100vh", color: "#f8fafc", paddingBottom: 110 }}>
      <Header />

      <main className="store-container" style={{ padding: "0 16px 36px", maxWidth: 640, margin: "0 auto" }}>
        {/* Navigation Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 14 }}>
          <Link
            href={`/s/${params.shopSlug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#94a3b8",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              background: "rgba(22, 27, 38, 0.6)",
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <ArrowLeft size={15} />
            <span>Store</span>
          </Link>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.name, url: deepLink }).catch(() => {});
              } else {
                navigator.clipboard.writeText(deepLink);
                showToast("success", "Link copied to clipboard!");
              }
            }}
            style={{
              background: "rgba(22, 27, 38, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 10,
              color: "#fff",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <Share2 size={14} color="#38bdf8" />
            <span>Share</span>
          </button>
        </div>

        {/* Hero Image Carousel */}
        <section
          className="ys-card"
          style={{
            background: "#121722",
            borderRadius: 20,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          <div style={{ width: "100%", height: 300, background: "#182030", position: "relative" }}>
            <TelegramImage
              fileId={allFileIds[activeImageIndex]}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {allFileIds.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 0,
                  right: 0,
                  display: "flex",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {allFileIds.map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: idx === activeImageIndex ? 22 : 6,
                      height: 6,
                      borderRadius: 3,
                      background: idx === activeImageIndex ? "#38bdf8" : "rgba(255, 255, 255, 0.4)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {allFileIds.length > 1 && (
            <div className="ys-hide-scrollbar" style={{ display: "flex", gap: 8, padding: 12, overflowX: "auto" }}>
              {allFileIds.map((fId, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: idx === activeImageIndex ? "2px solid #38bdf8" : "2px solid transparent",
                    flexShrink: 0,
                    cursor: "pointer",
                    boxShadow: idx === activeImageIndex ? "0 0 10px rgba(56, 189, 248, 0.3)" : "none",
                  }}
                >
                  <TelegramImage fileId={fId} alt={`Thumb ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Title, Pricing & Status Card */}
        <section
          className="ys-card"
          style={{
            background: "#121722",
            borderRadius: 18,
            padding: "16px 18px",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", letterSpacing: "-0.01em" }}>
              {formatPrice(product.price, product.currency)}
            </span>
            <span
              className={isAvailable ? "ys-chip ys-chip--success" : "ys-chip"}
              style={{
                fontSize: 11,
                padding: "3px 9px",
                background: isAvailable ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: isAvailable ? "#4ade80" : "#f87171",
                borderColor: isAvailable ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
              }}
            >
              {product.availability}
            </span>
          </div>

          <h1 style={{ fontSize: 19, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.35 }}>
            {product.name}
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <span className="ys-chip">
              Category: <strong style={{ color: "#fff", marginLeft: 4 }}>{product.category}</strong>
            </span>
            {product.condition && (
              <span className="ys-chip">
                Condition: <strong style={{ color: "#fff", marginLeft: 4 }}>{product.condition}</strong>
              </span>
            )}
          </div>
        </section>

        {/* Dynamic Specifications Matrix */}
        {metadataList.length > 0 && (
          <section
            className="ys-card"
            style={{
              background: "#121722",
              borderRadius: 18,
              padding: "16px 18px",
              marginBottom: 14,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: "0 0 12px", letterSpacing: "0.02em", textTransform: "uppercase" }}>
              Specifications
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {metadataList.map(([key, val]) => {
                const def = FIELD_DEFINITIONS[key];
                const label = def?.label || key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div
                    key={key}
                    style={{
                      background: "#182030",
                      borderRadius: 12,
                      padding: "10px 12px",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <p style={{ margin: "0 0 3px", fontSize: 11, color: "#94a3b8" }}>{label}</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#fff" }}>{String(val)}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Product Description */}
        {product.description && (
          <section
            className="ys-card"
            style={{
              background: "#121722",
              borderRadius: 18,
              padding: "16px 18px",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff", margin: "0 0 8px", textTransform: "uppercase" }}>
              Description
            </h3>
            <p style={{ margin: 0, fontSize: 13.5, color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {product.description}
            </p>
          </section>
        )}
      </main>

      {/* Floating Bottom Sticky Action Bar */}
      <div
        className="ys-glass"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)",
          display: "flex",
          gap: 12,
          zIndex: 100,
          maxWidth: 640,
          margin: "0 auto",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <button
          disabled={!isAvailable}
          onClick={() => setShowOrderModal(true)}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 14,
            background: isAvailable
              ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
              : "#334155",
            color: "#fff",
            border: "none",
            fontSize: 15,
            fontWeight: 800,
            cursor: isAvailable ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: isAvailable ? "0 4px 16px rgba(37, 99, 235, 0.35)" : "none",
            transition: "transform 0.15s ease",
          }}
        >
          <ShoppingCart size={18} />
          <span>{isAvailable ? "Order Directly" : "Out of Stock"}</span>
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
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Quantity
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: "#1c2436",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                padding: "0 12px",
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Contact Phone (Required)
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +251 91 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: "#1c2436",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                padding: "0 12px",
                fontSize: 14,
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 6 }}>
              Delivery Address / Specific Location (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bole Medhanialem, Addis Ababa"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 10,
                background: "#1c2436",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                padding: "10px 12px",
                fontSize: 13,
                resize: "none",
              }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <Button type="submit" variant="primary" loading={isSubmitting} block>
              Confirm Order ({formatPrice(product.price * quantity, product.currency)})
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
