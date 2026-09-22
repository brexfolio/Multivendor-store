"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useLanguage } from "@/lib/i18n";
import { formatPrice } from "@/lib/utils";
import { hapticImpact } from "@/lib/telegram";

export type SortOption = "featured" | "price_asc" | "price_desc" | "newest";

export interface FilterState {
  sort: SortOption;
  inStockOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
}

export const SLIDER_MIN = 0;
export const SLIDER_MAX = 200000;
export const SLIDER_STEP = 1000;

export const DEFAULT_FILTERS: FilterState = {
  sort: "featured",
  inStockOnly: false,
  minPrice: null,
  maxPrice: null,
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
}

const QUICK_PRICE_RANGES = [
  { key: "under20k", min: 0, max: 20000 },
  { key: "range20k50k", min: 20000, max: 50000 },
  { key: "range50k100k", min: 50000, max: 100000 },
  { key: "over100k", min: 100000, max: 200000 },
];

export default function FilterModal({
  isOpen,
  onClose,
  filters,
  onApply,
  onReset,
}: FilterModalProps) {
  const { t } = useLanguage();

  const [localSort, setLocalSort] = useState<SortOption>(filters.sort);
  const [localInStock, setLocalInStock] = useState(filters.inStockOnly);
  const [localMinPrice, setLocalMinPrice] = useState<number>(
    filters.minPrice !== null ? filters.minPrice : SLIDER_MIN
  );
  const [localMaxPrice, setLocalMaxPrice] = useState<number>(
    filters.maxPrice !== null ? filters.maxPrice : SLIDER_MAX
  );

  useEffect(() => {
    if (isOpen) {
      setLocalSort(filters.sort);
      setLocalInStock(filters.inStockOnly);
      setLocalMinPrice(filters.minPrice !== null ? filters.minPrice : SLIDER_MIN);
      setLocalMaxPrice(filters.maxPrice !== null ? filters.maxPrice : SLIDER_MAX);
    }
  }, [isOpen, filters]);

  const handleApply = () => {
    hapticImpact("medium");
    const isMinDefault = localMinPrice <= SLIDER_MIN;
    const isMaxDefault = localMaxPrice >= SLIDER_MAX;

    onApply({
      sort: localSort,
      inStockOnly: localInStock,
      minPrice: isMinDefault ? null : localMinPrice,
      maxPrice: isMaxDefault ? null : localMaxPrice,
    });
    onClose();
  };

  const handleReset = () => {
    hapticImpact("light");
    setLocalSort("featured");
    setLocalInStock(false);
    setLocalMinPrice(SLIDER_MIN);
    setLocalMaxPrice(SLIDER_MAX);
    onReset();
    onClose();
  };

  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.min(val, localMaxPrice - SLIDER_STEP);
    setLocalMinPrice(clamped);
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.max(val, localMinPrice + SLIDER_STEP);
    setLocalMaxPrice(clamped);
  };

  const handleQuickPrice = (min: number, max: number) => {
    hapticImpact("light");
    setLocalMinPrice(min);
    setLocalMaxPrice(max);
  };

  const minPercent = Math.max(
    0,
    Math.min(100, Math.round(((localMinPrice - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100))
  );
  const maxPercent = Math.max(
    0,
    Math.min(100, Math.round(((localMaxPrice - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100))
  );

  const sortOptions: { id: SortOption; labelKey: string }[] = [
    { id: "featured", labelKey: "filters.sortFeatured" },
    { id: "newest", labelKey: "filters.sortNewest" },
    { id: "price_asc", labelKey: "filters.sortPriceAsc" },
    { id: "price_desc", labelKey: "filters.sortPriceDesc" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("filters.title")}
      footer={
        <div className="filter-modal__footer">
          <Button variant="secondary" size="md" onClick={handleReset}>
            {t("filters.reset")}
          </Button>
          <Button variant="primary" size="md" onClick={handleApply}>
            {t("filters.apply")}
          </Button>
        </div>
      }
    >
      <div className="filter-modal__body">
        {/* Sort Section */}
        <div className="filter-section">
          <label className="filter-section__title">{t("filters.sortBy")}</label>
          <div className="filter-chips">
            {sortOptions.map((opt) => {
              const active = localSort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`filter-chip ${active ? "filter-chip--active" : ""}`}
                  onClick={() => {
                    hapticImpact("light");
                    setLocalSort(opt.id);
                  }}
                >
                  {t(opt.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="filter-section">
          <label className="filter-section__title">{t("filters.availability")}</label>
          <div className="store-toggle-row">
            <span className="store-toggle-row__label">{t("filters.inStockOnly")}</span>
            <label className="store-switch">
              <input
                type="checkbox"
                checked={localInStock}
                onChange={(e) => {
                  hapticImpact("light");
                  setLocalInStock(e.target.checked);
                }}
              />
              <span className="store-switch__track" />
            </label>
          </div>
        </div>

        {/* Dual Thumb Price Range Slider */}
        <div className="filter-section">
          <label className="filter-section__title">{t("filters.priceRange")}</label>

          {/* Current Values Display Cards */}
          <div className="range-slider__values">
            <div className="range-slider__value-box">
              <span className="range-slider__value-label">{t("filters.minPrice")}</span>
              <span className="range-slider__value-amount">
                {formatPrice(localMinPrice, "ETB")}
              </span>
            </div>
            <span className="range-slider__value-dash">—</span>
            <div className="range-slider__value-box range-slider__value-box--right">
              <span className="range-slider__value-label">{t("filters.maxPrice")}</span>
              <span className="range-slider__value-amount">
                {localMaxPrice >= SLIDER_MAX
                  ? `${formatPrice(SLIDER_MAX, "ETB")}+`
                  : formatPrice(localMaxPrice, "ETB")}
              </span>
            </div>
          </div>

          {/* Dual Range Track */}
          <div className="range-slider">
            <div className="range-slider__track">
              <div
                className="range-slider__fill"
                style={{
                  left: `${minPercent}%`,
                  width: `${Math.max(0, maxPercent - minPercent)}%`,
                }}
              />
            </div>
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={localMinPrice}
              onChange={handleMinSliderChange}
              className="range-slider__input range-slider__input--min"
              aria-label={t("filters.minPrice")}
            />
            <input
              type="range"
              min={SLIDER_MIN}
              max={SLIDER_MAX}
              step={SLIDER_STEP}
              value={localMaxPrice}
              onChange={handleMaxSliderChange}
              className="range-slider__input range-slider__input--max"
              aria-label={t("filters.maxPrice")}
            />
          </div>

          {/* Quick Range Chips */}
          <div className="filter-chips filter-chips--quick-price">
            {QUICK_PRICE_RANGES.map((range) => {
              const matches =
                localMinPrice === range.min && localMaxPrice === range.max;

              return (
                <button
                  key={range.key}
                  type="button"
                  className={`filter-chip filter-chip--sm ${matches ? "filter-chip--active" : ""}`}
                  onClick={() => handleQuickPrice(range.min, range.max)}
                >
                  {t(`filters.${range.key}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
