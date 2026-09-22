"use client";

import { useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import Header from "@/components/store/Header";
import SearchBar from "@/components/store/SearchBar";
import PromoBanner from "@/components/store/PromoBanner";
import CategoryFilter from "@/components/store/CategoryFilter";
import ProductGrid from "@/components/store/ProductGrid";
import FilterModal, { DEFAULT_FILTERS, type FilterState } from "@/components/store/FilterModal";
import { ProductGridSkeleton } from "@/components/ui/Loading";
import { apiGet } from "@/lib/apiClient";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types/product";

const SESSION_KEY = "habentech_home_filters";

export default function HomePage() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  // Restore filter state from session storage once on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.search === "string") setSearch(parsed.search);
        if (typeof parsed.category === "string") setCategory(parsed.category);
        if (parsed.filters && typeof parsed.filters === "object") {
          setFilters({
            sort: parsed.filters.sort ?? DEFAULT_FILTERS.sort,
            inStockOnly: Boolean(parsed.filters.inStockOnly),
            minPrice: typeof parsed.filters.minPrice === "number" ? parsed.filters.minPrice : null,
            maxPrice: typeof parsed.filters.maxPrice === "number" ? parsed.filters.maxPrice : null,
          });
        }
      }
    } catch {
      // sessionStorage unavailable or parsing error
    }
    setIsRestored(true);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sort !== "featured") count++;
    if (filters.inStockOnly) count++;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    return count;
  }, [filters]);

  useEffect(() => {
    if (!isRestored) return;

    // Persist current filters and search to sessionStorage
    try {
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ search, category, filters })
      );
    } catch {
      // Ignore sessionStorage errors
    }

    setIsLoading(true);

    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    if (filters.sort !== "featured") params.set("sort", filters.sort);
    if (filters.inStockOnly) params.set("in_stock", "true");
    if (filters.minPrice !== null) params.set("min_price", String(filters.minPrice));
    if (filters.maxPrice !== null) params.set("max_price", String(filters.maxPrice));

    const timeout = setTimeout(() => {
      apiGet<{ products: Product[] }>(`/api/products?${params.toString()}`)
        .then((data) => setProducts(data.products))
        .catch(() => setProducts([]))
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [search, category, filters, isRestored]);

  const removeFilter = (key: "sort" | "inStock" | "price") => {
    setFilters((prev) => {
      if (key === "sort") return { ...prev, sort: "featured" };
      if (key === "inStock") return { ...prev, inStockOnly: false };
      if (key === "price") return { ...prev, minPrice: null, maxPrice: null };
      return prev;
    });
  };

  const getSortLabel = () => {
    if (filters.sort === "newest") return t("filters.sortNewest");
    if (filters.sort === "price_asc") return t("filters.sortPriceAsc");
    if (filters.sort === "price_desc") return t("filters.sortPriceDesc");
    return t("filters.sortFeatured");
  };

  const getPriceLabel = () => {
    if (filters.minPrice !== null && filters.maxPrice !== null) {
      return `${formatPrice(filters.minPrice, "ETB")} - ${formatPrice(filters.maxPrice, "ETB")}`;
    }
    if (filters.minPrice !== null) {
      return `≥ ${formatPrice(filters.minPrice, "ETB")}`;
    }
    if (filters.maxPrice !== null) {
      return `≤ ${formatPrice(filters.maxPrice, "ETB")}`;
    }
    return "";
  };

  return (
    <div className="store-shell">
      <Header />
      <PromoBanner />
      <SearchBar
        value={search}
        onChange={setSearch}
        onFilterClick={() => setIsFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="active-filters-bar">
          {filters.sort !== "featured" && (
            <button
              type="button"
              className="active-filter-pill"
              onClick={() => removeFilter("sort")}
              title="Remove sort"
            >
              <span>{getSortLabel()}</span>
              <X size={13} />
            </button>
          )}

          {filters.inStockOnly && (
            <button
              type="button"
              className="active-filter-pill"
              onClick={() => removeFilter("inStock")}
              title="Remove in-stock filter"
            >
              <span>{t("filters.inStockOnly")}</span>
              <X size={13} />
            </button>
          )}

          {(filters.minPrice !== null || filters.maxPrice !== null) && (
            <button
              type="button"
              className="active-filter-pill"
              onClick={() => removeFilter("price")}
              title="Remove price filter"
            >
              <span>{getPriceLabel()}</span>
              <X size={13} />
            </button>
          )}

          <button
            type="button"
            className="active-filter-clear-all"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            {t("filters.clearAll")}
          </button>
        </div>
      )}

      <CategoryFilter selected={category} onSelect={setCategory} />

      {isLoading ? <ProductGridSkeleton /> : <ProductGrid products={products} />}

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApply={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
    </div>
  );
}
