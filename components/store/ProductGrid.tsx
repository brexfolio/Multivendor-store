"use client";

import { PackageSearch } from "lucide-react";
import type { Product } from "@/types/product";
import ProductCard from "./ProductCard";
import EmptyState from "@/components/ui/EmptyState";
import { useLanguage } from "@/lib/i18n";

export default function ProductGrid({ products }: { products: Product[] }) {
  const { t } = useLanguage();

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch size={26} />}
        title={t("product.noProducts")}
        description={t("product.noProductsHint")}
      />
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
