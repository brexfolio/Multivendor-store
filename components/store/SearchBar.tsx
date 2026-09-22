"use client";

import { Search, X, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { hapticImpact } from "@/lib/telegram";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick?: () => void;
  activeFilterCount?: number;
}

export default function SearchBar({
  value,
  onChange,
  onFilterClick,
  activeFilterCount = 0,
}: SearchBarProps) {
  const { t } = useLanguage();

  const handleFilter = () => {
    hapticImpact("light");
    onFilterClick?.();
  };

  return (
    <div className="search-bar">
      <Search size={18} className="search-bar__icon" />
      <input
        type="search"
        className="search-bar__input"
        placeholder={t("search.placeholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("search.placeholder")}
      />
      {value && (
        <button
          type="button"
          className="search-bar__clear"
          onClick={() => onChange("")}
          aria-label={t("search.clear")}
        >
          <X size={16} />
        </button>
      )}
      {onFilterClick && (
        <button
          type="button"
          className={`search-bar__filter-btn ${
            activeFilterCount > 0 ? "search-bar__filter-btn--active" : ""
          }`}
          onClick={handleFilter}
          aria-label={t("filters.filterButton")}
          title={t("filters.filterButton")}
        >
          <SlidersHorizontal size={17} />
          {activeFilterCount > 0 && (
            <span className="search-bar__filter-badge" aria-hidden="true">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}