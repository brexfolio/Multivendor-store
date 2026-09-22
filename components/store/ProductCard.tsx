"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, ImageOff } from "lucide-react";
import type { Product } from "@/types/product";
import { formatPrice } from "@/lib/utils";
import { useFavorites } from "@/lib/useFavorites";
import { hapticImpact } from "@/lib/telegram";
import { useLanguage } from "@/lib/i18n";

const BADGE_CLASS: Record<string, string> = {
  Available: "",
  "Low Stock": "product-card__badge--low-stock",
  Sold: "product-card__badge--sold",
  Unavailable: "product-card__badge--unavailable",
  "Out of Stock": "product-card__badge--out-of-stock",
};

const PARTICLE_COUNT = 8;
const PARTICLE_ANGLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => (360 / PARTICLE_COUNT) * i + 22.5);

export default function ProductCard({ product }: { product: Product }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { t, tv } = useLanguage();
  const image = product.images?.[0];
  const favorite = isFavorite(product.id);
  const [heartKey, setHeartKey] = useState(0);
  const [burst, setBurst] = useState(0);

  const handleFavorite = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    hapticImpact("light");
    setHeartKey((k) => k + 1);
    setBurst((b) => b + 1);
    toggleFavorite(product.id);
  };

  return (
    <Link href={`/products/${product.id}`} className="product-card">
      <div className="product-card__image-wrap">
        {image ? (
          <img src={image.image_url} alt={product.name} className="product-card__image" loading="lazy" />
        ) : (
          <div className="product-card__image" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--store-text-muted)" }}>
            <ImageOff size={28} />
          </div>
        )}
        <span className={`product-card__badge ${BADGE_CLASS[product.availability] ?? ""}`}>
          {tv("availability", product.availability)}
        </span>
        <button
          type="button"
          className={`product-card__favorite ${favorite ? "product-card__favorite--active" : ""}`}
          onClick={handleFavorite}
          aria-label={favorite ? t("favorites.remove") : t("favorites.add")}
          aria-pressed={favorite}
        >
          <span key={heartKey} className={`product-card__heart ${favorite ? "product-card__heart--pop" : ""}`}>
            <Heart size={15} fill={favorite ? "currentColor" : "none"} />
          </span>
          {burst > 0 && (
            <span className={`product-card__burst ${favorite ? "product-card__burst--on" : "product-card__burst--off"}`} key={`burst-${burst}`}>
              {PARTICLE_ANGLES.map((angle, i) => (
                <span
                  key={i}
                  className="product-card__particle"
                  style={{ ["--angle" as string]: `${angle}deg` }}
                />
              ))}
            </span>
          )}
        </button>
      </div>
      <div className="product-card__body">
        <p className="product-card__name">{product.name}</p>
        <div className="product-card__footer">
          <span className="product-card__price">{formatPrice(product.price, product.currency)}</span>
        </div>
      </div>
    </Link>
  );
}
