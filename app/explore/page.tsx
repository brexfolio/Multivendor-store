"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, Store, ShoppingBag, ArrowRight, CheckCircle2, X } from "lucide-react";
import Header from "@/components/store/Header";
import TelegramImage from "@/components/ui/TelegramImage";
import { SHOP_TYPE_CONFIGS, ALL_SHOP_TYPES, type ShopType } from "@/lib/shopTypeConfig";
import { formatPrice } from "@/lib/utils";
import type { Tenant } from "@/types/tenant";
import type { Product } from "@/types/product";
import { apiGet } from "@/lib/apiClient";

export default function MarketplaceExplorePage() {
  const [shops, setShops] = useState<Tenant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedType, setSelectedType] = useState<ShopType | "all">("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const shopParams = new URLSearchParams();
    if (selectedType !== "all") shopParams.set("shop_type", selectedType);
    if (search.trim()) shopParams.set("search", search.trim());

    const productParams = new URLSearchParams();
    if (search.trim()) productParams.set("search", search.trim());
    productParams.set("limit", "20");

    Promise.all([
      apiGet<{ tenants: Tenant[] }>(`/api/tenants?${shopParams.toString()}`).catch(() => ({ tenants: [] })),
      apiGet<{ products: Product[] }>(`/api/products?${productParams.toString()}`).catch(() => ({ products: [] })),
    ])
      .then(([tenantsData, productsData]) => {
        setShops(tenantsData.tenants || []);
        setProducts(productsData.products || []);
      })
      .finally(() => setIsLoading(false));
  }, [selectedType, search]);

  return (
    <div className="store-shell" style={{ background: "#0a0d14", minHeight: "100vh", color: "#f8fafc" }}>
      <Header />

      <main className="store-container" style={{ padding: "0 16px 32px", maxWidth: 640, margin: "0 auto" }}>
        {/* Hero Ambient Banner */}
        <section
          className="ys-card ys-glow-blue"
          style={{
            position: "relative",
            background: "linear-gradient(145deg, #131b2e 0%, #0c111d 100%)",
            borderRadius: 20,
            padding: "22px 18px",
            marginTop: 12,
            marginBottom: 18,
            border: "1px solid rgba(56, 189, 248, 0.2)",
            overflow: "hidden",
          }}
        >
          {/* Ambient Glow Orb */}
          <div
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span
              className="ys-chip ys-chip--primary"
              style={{ padding: "3px 9px", fontSize: 10.5, textTransform: "uppercase" }}
            >
              <Sparkles size={11} />
              <span>Yegna Suqq • የኛ ሱቅ</span>
            </span>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              margin: "0 0 6px",
              color: "#ffffff",
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
            }}
          >
            Discover Top Ethiopian Shops
          </h1>

          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.45 }}>
            Fashion, Electronics, Furniture, Vehicles, Beauty & more, verified and ready to order inside Telegram.
          </p>
        </section>

        {/* Global Search Bar */}
        <div
          className="ys-glass"
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: 14,
            padding: "0 14px",
            height: 48,
            marginBottom: 16,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Search size={18} color="#94a3b8" style={{ marginRight: 10, flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stores, brands, or items..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 14,
              width: "100%",
              fontWeight: 500,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                padding: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Pill Scroller */}
        <div
          className="ys-hide-scrollbar"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            marginBottom: 24,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            onClick={() => setSelectedType("all")}
            style={{
              padding: "8px 16px",
              borderRadius: 9999,
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: "nowrap",
              border: selectedType === "all" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
              cursor: "pointer",
              backgroundColor: selectedType === "all" ? "#1e293b" : "rgba(22, 27, 38, 0.7)",
              color: selectedType === "all" ? "#38bdf8" : "#cbd5e1",
              boxShadow: selectedType === "all" ? "0 2px 10px rgba(56, 189, 248, 0.2)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            ✨ All Categories
          </button>
          {ALL_SHOP_TYPES.map((typeKey) => {
            const cfg = SHOP_TYPE_CONFIGS[typeKey];
            const isSelected = selectedType === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setSelectedType(typeKey)}
                style={{
                  padding: "8px 15px",
                  borderRadius: 9999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  border: isSelected ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "#1e293b" : "rgba(22, 27, 38, 0.7)",
                  color: isSelected ? "#38bdf8" : "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.2s ease",
                }}
              >
                <span>{cfg.icon}</span>
                <span>{cfg.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Featured Stores Section */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
              <Store size={18} color="#38bdf8" />
              <span>Verified Stores</span>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>({shops.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="ys-card"
                  style={{ width: 140, height: 130, flexShrink: 0, background: "#131722", opacity: 0.6 }}
                />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div
              className="ys-card"
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
                background: "rgba(22, 27, 38, 0.5)",
              }}
            >
              No shops registered in this category yet.
            </div>
          ) : (
            <div
              className="ys-hide-scrollbar"
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 6,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {shops.map((shop) => {
                const cfg = SHOP_TYPE_CONFIGS[shop.shop_type] || SHOP_TYPE_CONFIGS.other;
                return (
                  <Link
                    key={shop.id}
                    href={`/s/${shop.slug}`}
                    style={{ textDecoration: "none", color: "inherit", flexShrink: 0 }}
                  >
                    <div
                      className="ys-card ys-card--interactive"
                      style={{
                        width: 140,
                        padding: "16px 12px 14px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        background: "#121722",
                      }}
                    >
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: "50%",
                          overflow: "hidden",
                          marginBottom: 10,
                          background: "#1c2436",
                          border: "2px solid rgba(56, 189, 248, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        }}
                      >
                        <TelegramImage
                          fileId={shop.logo_file_id}
                          alt={shop.name}
                          fallbackIcon={<Store size={24} color="#38bdf8" />}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 3, maxWidth: "100%", justifyContent: "center" }}>
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "#fff",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {shop.name}
                        </span>
                        <CheckCircle2 size={13} color="#38bdf8" style={{ flexShrink: 0 }} />
                      </div>

                      <span
                        className="ys-chip"
                        style={{ marginTop: 6, padding: "2px 8px", fontSize: 10.5 }}
                      >
                        <span>{cfg.icon}</span>
                        <span>{cfg.label.split(" ")[0]}</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Trending Listings Section */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 7 }}>
              <ShoppingBag size={18} color="#34d399" />
              <span>Trending Listings</span>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>({products.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="ys-card"
                  style={{ height: 210, background: "#131722", opacity: 0.6 }}
                />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div
              className="ys-card"
              style={{
                padding: "36px 16px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13.5,
                background: "rgba(22, 27, 38, 0.5)",
              }}
            >
              No products found. Check back soon!
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {products.map((p) => {
                const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
                const shopSlug = p.tenant?.slug || "";
                return (
                  <Link
                    key={p.id}
                    href={shopSlug ? `/s/${shopSlug}/products/${p.id}` : `/products/${p.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className="ys-card ys-card--interactive" style={{ background: "#121722", height: "100%", display: "flex", flexDirection: "column" }}>
                      <div style={{ width: "100%", height: 140, background: "#182030", position: "relative", overflow: "hidden" }}>
                        <TelegramImage
                          fileId={fileId}
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />

                        {p.tenant?.name && (
                          <span
                            style={{
                              position: "absolute",
                              top: 8,
                              left: 8,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 6,
                              backgroundColor: "rgba(10, 13, 20, 0.8)",
                              backdropFilter: "blur(8px)",
                              color: "#e2e8f0",
                              border: "1px solid rgba(255,255,255,0.1)",
                              maxWidth: "85%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.tenant.name}
                          </span>
                        )}

                        {p.availability !== "Available" && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: 8,
                              right: 8,
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "rgba(220, 38, 38, 0.85)",
                              color: "#fff",
                            }}
                          >
                            {p.availability}
                          </span>
                        )}
                      </div>

                      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                        <p
                          style={{
                            margin: "0 0 6px",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#fff",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            lineHeight: 1.3,
                          }}
                        >
                          {p.name}
                        </p>

                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "auto" }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>
                            {formatPrice(p.price, p.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
