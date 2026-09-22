"use client";

import { useEffect, useState } from "react";
import { HeartOff } from "lucide-react";
import Header from "@/components/store/Header";
import ProductGrid from "@/components/store/ProductGrid";
import { ProductGridSkeleton } from "@/components/ui/Loading";
import EmptyState from "@/components/ui/EmptyState";
import { apiGet } from "@/lib/apiClient";
import { useFavorites } from "@/lib/useFavorites";
import { useLanguage } from "@/lib/i18n";
import type { Product } from "@/types/product";

export default function FavoritesPage() {
  const { t } = useLanguage();
  const { favorites, isLoaded } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (favorites.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    const ids = Array.from(new Set(favorites));

    // Instant local cleanup when items are removed
    setProducts((prev) => prev.filter((p) => ids.includes(p.id)));

    const url = `/api/products?ids=${ids.map(encodeURIComponent).join(",")}`;
    apiGet<{ products: Product[] }>(url)
      .then((data) => {
        const order = new Map(ids.map((id, index) => [id, index]));
        const matched = data.products.filter((p) => order.has(p.id));
        matched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setProducts(matched);
      })
      .catch(() => setProducts([]))
      .finally(() => setIsLoading(false));
  }, [isLoaded, favorites]);

  return (
    <div className="store-shell">
      <Header />
      <div className="page-header">
        <h1 className="page-header__title">{t("favorites.title")}</h1>
      </div>

      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<HeartOff size={26} />}
          title={t("favorites.emptyTitle")}
          description={t("favorites.emptyDescription")}
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
