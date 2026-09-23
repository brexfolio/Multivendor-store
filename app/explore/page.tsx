"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, Store, ShoppingBag, ArrowRight } from "lucide-react";
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
    productParams.set("limit", "16");

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
    <div className="store-shell">
      <Header />

      {/* Hero Marketplace Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #182236 0%, #0d121f 100%)",
          borderRadius: 16,
          padding: "20px 18px",
          marginTop: 10,
          marginBottom: 16,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Sparkles size={16} color="#60a5fa" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Telegram Marketplace
          </span>
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
          Discover Verified Shops
        </h1>
        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
          Electronics, Fashion, Vehicles, Furniture, Grocery & more directly inside Telegram.
        </p>
      </div>

      {/* Global Search Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#161b26",
          borderRadius: 12,
          padding: "0 12px",
          height: 44,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: 16,
        }}
      >
        <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or stores..."
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 14,
            width: "100%",
          }}
        />
      </div>

      {/* Shop Category Filter Chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 8,
          marginBottom: 20,
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() => setSelectedType("all")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 12.5,
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: "none",
            cursor: "pointer",
            backgroundColor: selectedType === "all" ? "#2f6bff" : "#1a2233",
            color: "#fff",
            transition: "background 0.2s",
          }}
        >
          🌟 All Categories
        </button>
        {ALL_SHOP_TYPES.map((typeKey) => {
          const cfg = SHOP_TYPE_CONFIGS[typeKey];
          const isSelected = selectedType === typeKey;
          return (
            <button
              key={typeKey}
              onClick={() => setSelectedType(typeKey)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: "nowrap",
                border: "none",
                cursor: "pointer",
                backgroundColor: isSelected ? "#2f6bff" : "#1a2233",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.2s",
              }}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Featured Shops Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
            <Store size={18} color="#60a5fa" />
            <span>Featured Stores ({shops.length})</span>
          </h2>
        </div>

        {shops.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b", background: "#161b26", borderRadius: 12 }}>
            No stores found in this category.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {shops.map((shop) => {
              const cfg = SHOP_TYPE_CONFIGS[shop.shop_type] || SHOP_TYPE_CONFIGS.other;
              return (
                <Link
                  key={shop.id}
                  href={`/s/${shop.slug}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "#161b26",
                      borderRadius: 14,
                      padding: 12,
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      transition: "transform 0.15s, border-color 0.15s",
                    }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", marginBottom: 8, background: "#1f293d" }}>
                      <TelegramImage fileId={shop.logo_file_id} alt={shop.name} fallbackIcon={<Store size={26} color="#60a5fa" />} />
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {shop.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <span>{cfg.icon}</span>
                      <span>{cfg.label.split(" ")[0]}</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Trending Products Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingBag size={18} color="#34d399" />
            <span>Trending Listings</span>
          </h2>
        </div>

        {products.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b", background: "#161b26", borderRadius: 12 }}>
            No products available yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {products.map((p) => {
              const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
              const shopSlug = p.tenant?.slug || "habentech";
              return (
                <Link
                  key={p.id}
                  href={`/s/${shopSlug}/products/${p.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "#161b26",
                      borderRadius: 14,
                      overflow: "hidden",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ width: "100%", height: 130, background: "#1f293d", position: "relative" }}>
                      <TelegramImage fileId={fileId} alt={p.name} />
                      <span
                        style={{
                          position: "absolute",
                          bottom: 6,
                          left: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(0, 0, 0, 0.75)",
                          color: "#93c5fd",
                        }}
                      >
                        {p.tenant?.name || "Shop"}
                      </span>
                    </div>
                    <div style={{ padding: 10 }}>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#38bdf8" }}>
                        {formatPrice(p.price, p.currency)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Vendor CTA */}
      <div
        style={{
          marginTop: 30,
          marginBottom: 40,
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
          borderRadius: 16,
          padding: 18,
          textAlign: "center",
          border: "1px solid rgba(96, 165, 250, 0.2)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px", color: "#fff" }}>
          Own a business?
        </h3>
        <p style={{ fontSize: 12.5, color: "#cbd5e1", margin: "0 0 14px", lineHeight: 1.4 }}>
          Launch your own Telegram Mini App store in 60 seconds with zero coding.
        </p>
        <Link href="/admin?action=onboarding" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Open Your Shop</span>
            <ArrowRight size={15} />
          </button>
        </Link>
      </div>
    </div>
  );
}