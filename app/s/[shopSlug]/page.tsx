"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MessageCircle,
  Phone,
  Store,
  SlidersHorizontal,
  X,
  Share2,
  Package,
} from "lucide-react";
import Header from "@/components/store/Header";
import TelegramImage from "@/components/ui/TelegramImage";
import { getShopTypeConfig } from "@/lib/shopTypeConfig";
import { formatPrice } from "@/lib/utils";
import { apiGet } from "@/lib/apiClient";
import type { Tenant } from "@/types/tenant";
import type { Product } from "@/types/product";

export default function VendorStorefrontPage() {
  const params = useParams<{ shopSlug: string }>();
  const router = useRouter();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    if (!params.shopSlug) return;
    setIsLoading(true);

    apiGet<{ tenant: Tenant }>(`/api/tenants/${params.shopSlug}`)
      .then((data) => {
        setTenant(data.tenant);
        return apiGet<{ products: Product[] }>(`/api/products?tenant=${params.shopSlug}`);
      })
      .then((pData) => {
        setProducts(pData.products || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setIsLoading(false));
  }, [params.shopSlug]);

  const config = useMemo(() => {
    return getShopTypeConfig(tenant?.shop_type);
  }, [tenant]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (inStockOnly && (p.availability === "Sold" || p.availability === "Out of Stock" || p.availability === "Unavailable")) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesDesc = (p.description || "").toLowerCase().includes(query);
        const matchesMeta = Object.values(p.metadata || {}).some(
          (v) => String(v).toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDesc && !matchesMeta) return false;
      }
      if (activeFilter !== "all") {
        if (p.category !== activeFilter && p.condition !== activeFilter) return false;
      }
      return true;
    });
  }, [products, inStockOnly, search, activeFilter]);

  if (notFound) {
    return (
      <div className="store-shell" style={{ textAlign: "center", padding: "60px 20px" }}>
        <Store size={48} color="#64748b" style={{ marginBottom: 12 }} />
        <h2 style={{ color: "#fff", fontSize: 20 }}>Store Not Found</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
          The shop "{params.shopSlug}" does not exist or may have been deactivated.
        </p>
        <Link href="/explore">
          <button style={{ padding: "10px 20px", borderRadius: 8, background: "#2f6bff", color: "#fff", border: "none" }}>
            Explore Other Stores
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="store-shell">
      <Header />

      {/* Vendor Profile Header Card */}
      <div
        style={{
          background: "#161b26",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          marginTop: 10,
          marginBottom: 16,
        }}
      >
        {/* Banner */}
        <div style={{ height: 110, width: "100%", background: "#1f293d", position: "relative" }}>
          {tenant?.banner_file_id ? (
            <TelegramImage fileId={tenant.banner_file_id} alt={tenant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }} />
          )}

          {/* Share Shop Button */}
          <button
            onClick={() => {
              if (navigator.share && tenant) {
                navigator.share({
                  title: tenant.name,
                  url: `https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YegnaSuqqBot"}/app?startapp=s_${tenant.slug}`,
                }).catch(() => {});
              }
            }}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(0,0,0,0.6)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Logo & Info */}
        <div style={{ padding: "0 16px 16px", marginTop: -32, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                border: "3px solid #161b26",
                overflow: "hidden",
                background: "#1e293b",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              <TelegramImage fileId={tenant?.logo_file_id} alt={tenant?.name || "Logo"} fallbackIcon={<Store size={30} color="#60a5fa" />} />
            </div>

            {/* Support / Contact Buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              {tenant?.support_telegram && (
                <a
                  href={`https://t.me/${tenant.support_telegram.replace("@", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "#229ed9",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MessageCircle size={14} />
                  <span>Chat</span>
                </a>
              )}
              {tenant?.contact_phone && (
                <a
                  href={`tel:${tenant.contact_phone}`}
                  style={{
                    background: "#1e293b",
                    color: "#cbd5e1",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <Phone size={14} />
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
              {tenant?.name || "Loading..."}
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
              }}
            >
              {config.icon} {config.label.split(" ")[0]}
            </span>
          </div>

          {tenant?.description && (
            <p style={{ fontSize: 12.5, color: "#94a3b8", margin: "6px 0 0", lineHeight: 1.4 }}>
              {tenant.description}
            </p>
          )}
        </div>
      </div>

      {/* Search & Stock Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            backgroundColor: "#161b26",
            borderRadius: 12,
            padding: "0 12px",
            height: 42,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Search size={16} color="#64748b" style={{ marginRight: 8 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${config.listingLabel.toLowerCase()}s...`}
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: 13.5,
              width: "100%",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
              <X size={15} />
            </button>
          )}
        </div>

        <button
          onClick={() => setInStockOnly(!inStockOnly)}
          style={{
            padding: "0 12px",
            borderRadius: 12,
            border: inStockOnly ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.08)",
            background: inStockOnly ? "rgba(16, 185, 129, 0.15)" : "#161b26",
            color: inStockOnly ? "#34d399" : "#94a3b8",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          In Stock
        </button>
      </div>

      {/* Products Display — Adaptive Layout */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading {config.listingLabel.toLowerCase()}s...</div>
      ) : filteredProducts.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#161b26", borderRadius: 14, color: "#94a3b8" }}>
          <Package size={36} color="#475569" style={{ marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No {config.listingLabel.toLowerCase()}s match your search</p>
        </div>
      ) : (
        renderProductsByLayout(config.layout, filteredProducts, params.shopSlug, config.productFields)
      )}
    </div>
  );
}

/**
 * Renders products according to the shop type layout:
 * - 'grid': standard 2-col responsive cards (Clothing, Electronics, Beauty)
 * - 'large_card': full-width photo showcase (Furniture)
 * - 'detail_card': vehicle summary card with make, year, mileage, transmission (Vehicles)
 * - 'compact': compact row list (Food, Books)
 */
function renderProductsByLayout(
  layout: string,
  products: Product[],
  shopSlug: string,
  productFields: string[]
) {
  if (layout === "large_card") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {products.map((p) => {
          const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
          return (
            <Link key={p.id} href={`/s/${shopSlug}/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#161b26", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: "100%", height: 220, background: "#1f293d", position: "relative" }}>
                  <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.75)", color: "#fff", padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {p.availability}
                  </span>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{p.name}</h3>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{formatPrice(p.price, p.currency)}</span>
                  </div>
                  {p.metadata && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {Object.entries(p.metadata).slice(0, 3).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 11, background: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 6, color: "#94a3b8" }}>
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  if (layout === "detail_card") {
    // Vehicles layout
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {products.map((p) => {
          const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
          const meta = p.metadata || {};
          return (
            <Link key={p.id} href={`/s/${shopSlug}/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#161b26", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column" }}>
                <div style={{ width: "100%", height: 180, background: "#1f293d", position: "relative" }}>
                  <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(15, 23, 42, 0.85)", color: "#38bdf8", padding: "4px 10px", borderRadius: 6, fontSize: 15, fontWeight: 800 }}>
                    {formatPrice(p.price, p.currency)}
                  </span>
                </div>
                <div style={{ padding: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 8px" }}>{p.name}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {Boolean(meta.year) && <div style={{ background: "#1f293d", padding: "4px 6px", borderRadius: 6, fontSize: 11, textAlign: "center", color: "#cbd5e1" }}>📅 {String(meta.year)}</div>}
                    {Boolean(meta.mileage) && <div style={{ background: "#1f293d", padding: "4px 6px", borderRadius: 6, fontSize: 11, textAlign: "center", color: "#cbd5e1" }}>🛣 {Number(meta.mileage).toLocaleString()} km</div>}
                    {Boolean(meta.fuel_type) && <div style={{ background: "#1f293d", padding: "4px 6px", borderRadius: 6, fontSize: 11, textAlign: "center", color: "#cbd5e1" }}>⛽ {String(meta.fuel_type)}</div>}
                    {Boolean(meta.transmission) && <div style={{ background: "#1f293d", padding: "4px 6px", borderRadius: 6, fontSize: 11, textAlign: "center", color: "#cbd5e1" }}>⚙️ {String(meta.transmission)}</div>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  if (layout === "compact") {
    // Food & Books layout
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {products.map((p) => {
          const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
          const meta = p.metadata || {};
          return (
            <Link key={p.id} href={`/s/${shopSlug}/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ background: "#161b26", borderRadius: 12, padding: 10, border: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 8, overflow: "hidden", background: "#1f293d", flexShrink: 0 }}>
                  <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</h4>
                  <p style={{ margin: "0 0 4px", fontSize: 11.5, color: "#94a3b8" }}>
                    {String(meta.weight || meta.author || meta.volume || p.category)}
                  </p>
                  <span style={{ fontSize: 13.5, fontWeight: 800, color: "#38bdf8" }}>{formatPrice(p.price, p.currency)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // Default 'grid' (Clothing, Electronics, Beauty, General)
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
      {products.map((p) => {
        const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
        const meta = p.metadata || {};
        return (
          <Link key={p.id} href={`/s/${shopSlug}/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ background: "#161b26", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ width: "100%", height: 140, background: "#1f293d", position: "relative" }}>
                <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {Boolean(meta.size) && (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.75)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                    {String(meta.size)}
                  </span>
                )}
                {p.availability !== "Available" && (
                  <span style={{ position: "absolute", bottom: 6, right: 6, background: "rgba(220, 38, 38, 0.85)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                    {p.availability}
                  </span>
                )}
              </div>
              <div style={{ padding: 10 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </p>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#38bdf8" }}>
                  {formatPrice(p.price, p.currency)}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}