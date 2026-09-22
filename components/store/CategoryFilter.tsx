"use client";

import { useLanguage } from "@/lib/i18n";

const CATEGORIES = [
  "All",
  "Smartphones",
  "Laptops",
  "Tablets",
  "Accessories",
  "Smart Watches",
  "Gaming",
  "Other",
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  const { t, tv } = useLanguage();

  return (
    <div className="category-filter" role="tablist" aria-label={t("home.filterByCategory")}>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          role="tab"
          aria-selected={selected === category}
          className={`category-filter__item ${
            selected === category ? "category-filter__item--active" : ""
          }`}
          onClick={() => onSelect(category)}
        >
          {tv("productCategory", category)}
        </button>
      ))}
    </div>
  );
}
