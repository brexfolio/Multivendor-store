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
  CheckCircle2,
  Sparkles,
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
      <div className="store-shell" style={{ background: "#0a0d14", minHeight: "100vh", textAlign: "center", padding: "60px 20px" }}>
        <Store size={48} color="#64748b" style={{ marginBottom: 12 }} />
        <h2 style={{ color: "#fff", fontSize: 20 }}>Store Not Found</h2>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 20 }}>
          The shop "{params.shopSlug}" does not exist or may have been deactivated.
        </p>
        <Link href="/explore">
          <button style={{ padding: "10px 20px", borderRadius: 10, background: "#2563eb", color: "#fff", border: "none", fontWeight: 700 }}>
            Explore All Stores
          </button>
        </Link>
      </div>
    );
  }

  const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "YegnaSuqqBot";

  return (
    <div className="store-shell" style={{ background: "#0a0d14", minHeight: "100vh", color: "#f8fafc" }}>
      <Header storeName={tenant?.name || "Yegna Suqq"} />

      <main className="store-container" style={{ padding: "0 16px 36px", maxWidth: 640, margin: "0 auto" }}>
        {/* Vendor Profile Header Card */}
        <section
          className="ys-card"
          style={{
            background: "#121722",
            borderRadius: 20,
            overflow: "hidden",
            marginTop: 12,
            marginBottom: 18,
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          }}
        >
          {/* Banner */}
          <div style={{ height: 110, width: "100%", background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", position: "relative" }}>
            {tenant?.banner_file_id && (
              <TelegramImage fileId={tenant.banner_file_id} alt={tenant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}

            {/* Share Shop Button */}
            <button
              onClick={() => {
                if (navigator.share && tenant) {
                  navigator.share({
                    title: tenant.name,
                    url: `https://t.me/${botUser}/app?startapp=s_${tenant.slug}`,
                  }).catch(() => {});
                }
              }}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50%",
                width: 34,
                height: 34,
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

          {/* Logo & Info Bar */}
          <div style={{ padding: "0 16px 16px", marginTop: -32, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: 18,
                  border: "3px solid #121722",
                  overflow: "hidden",
                  background: "#1c2436",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TelegramImage fileId={tenant?.logo_file_id} alt={tenant?.name || "Logo"} fallbackIcon={<Store size={32} color="#38bdf8" />} />
              </div>

              {/* Direct Telegram Support / Phone Contact */}
              <div style={{ display: "flex", gap: 8 }}>
                {tenant?.support_telegram && (
                  <a
                    href={`https://t.me/${tenant.support_telegram.replace("@", "")}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "rgba(34, 158, 217, 0.15)",
                      border: "1px solid rgba(34, 158, 217, 0.3)",
                      color: "#38bdf8",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <MessageCircle size={15} />
                    <span>Chat</span>
                  </a>
                )}
                {tenant?.contact_phone && (
                  <a
                    href={`tel:${tenant.contact_phone}`}
                    style={{
                      background: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      color: "#4ade80",
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Phone size={15} />
                    <span>Call</span>
                  </a>
                )}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <h1 style={{ fontSize: 19, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                  {tenant?.name}
                </h1>
                <CheckCircle2 size={16} color="#38bdf8" />
              </div>

              {tenant?.description && (
                <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 10px", lineHeight: 1.4 }}>
                  {tenant.description}
                </p>
              )}

              {/* Store Meta Chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                <span className="ys-chip ys-chip--primary">
                  <span>{config.icon}</span>
                  <span>{config.label}</span>
                </span>
                <span className="ys-chip">
                  <Package size={12} color="#94a3b8" />
                  <span>{products.length} Items</span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Search & In-Stock Filter Bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div
            className="ys-glass"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              borderRadius: 12,
              padding: "0 12px",
              height: 44,
            }}
          >
            <Search size={16} color="#94a3b8" style={{ marginRight: 8, flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${tenant?.name || "store"}...`}
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: 13.5,
                width: "100%",
                fontWeight: 500,
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex" }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            onClick={() => setInStockOnly(!inStockOnly)}
            style={{
              padding: "0 14px",
              borderRadius: 12,
              border: inStockOnly ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)",
              background: inStockOnly ? "#1e293b" : "rgba(22, 27, 38, 0.7)",
              color: inStockOnly ? "#38bdf8" : "#94a3b8",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            In Stock
          </button>
        </div>

        {/* Storefront Layout Rendering */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="ys-card" style={{ height: 210, background: "#131722", opacity: 0.6 }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className="ys-card"
            style={{
              padding: "40px 16px",
              textAlign: "center",
              color: "#94a3b8",
              fontSize: 13.5,
              background: "rgba(22, 27, 38, 0.5)",
            }}
          >
            No listings match your search or filter.
          </div>
        ) : (
          renderProductsByLayout(config.layout, filteredProducts, params.shopSlug)
        )}
      </main>
    </div>
  );
}

function renderProductsByLayout(
  layout: string,
  products: Product[],
  shopSlug: string
) {
  if (layout === "large_card") {
    // Furniture & Large items
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {products.map((p) => {
          const fileId = p.image_file_ids?.[0] || p.images?.[0]?.telegram_file_id;
          return (
            <Link key={p.id} href={`/s/${shopSlug}/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="ys-card ys-card--interactive" style={{ background: "#121722" }}>
                <div style={{ width: "100%", height: 200, background: "#182030", position: "relative" }}>
                  <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(10, 13, 20, 0.8)",
                      backdropFilter: "blur(6px)",
                      color: "#fff",
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: 10.5,
                      fontWeight: 700,
                    }}
                  >
                    {p.availability}
                  </span>
                </div>
                <div style={{ padding: "14px 14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>{p.name}</h3>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#38bdf8" }}>{formatPrice(p.price, p.currency)}</span>
                  </div>
                  {p.metadata && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {Object.entries(p.metadata).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="ys-chip" style={{ fontSize: 10.5, padding: "2px 7px" }}>
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
              <div className="ys-card ys-card--interactive" style={{ background: "#121722" }}>
                <div style={{ width: "100%", height: 190, background: "#182030", position: "relative" }}>
                  <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(10, 13, 20, 0.85)", backdropFilter: "blur(8px)", color: "#38bdf8", padding: "4px 10px", borderRadius: 8, fontSize: 15, fontWeight: 800 }}>
                    {formatPrice(p.price, p.currency)}
                  </span>
                </div>
                <div style={{ padding: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{p.name}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {Boolean(meta.year) && <div className="ys-chip" style={{ justifyContent: "center" }}>📅 {String(meta.year)}</div>}
                    {Boolean(meta.mileage) && <div className="ys-chip" style={{ justifyContent: "center" }}>🛣️ {Number(meta.mileage).toLocaleString()} km</div>}
                    {Boolean(meta.fuel_type) && <div className="ys-chip" style={{ justifyContent: "center" }}>⛽ {String(meta.fuel_type)}</div>}
                    {Boolean(meta.transmission) && <div className="ys-chip" style={{ justifyContent: "center" }}>⚙️ {String(meta.transmission)}</div>}
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
              <div className="ys-card ys-card--interactive" style={{ background: "#121722", padding: 10, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", background: "#182030", flexShrink: 0 }}>
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
            <div className="ys-card ys-card--interactive" style={{ background: "#121722", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ width: "100%", height: 140, background: "#182030", position: "relative" }}>
                <TelegramImage fileId={fileId} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {Boolean(meta.size) && (
                  <span style={{ position: "absolute", top: 8, left: 8, background: "rgba(10, 13, 20, 0.8)", backdropFilter: "blur(6px)", color: "#fff", padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
                    {String(meta.size)}
                  </span>
                )}
                {p.availability !== "Available" && (
                  <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(220, 38, 38, 0.85)", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 9.5, fontWeight: 700 }}>
                    {p.availability}
                  </span>
                )}
              </div>
              <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.3 }}>
                  {p.name}
                </p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#38bdf8" }}>
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
