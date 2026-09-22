"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n";

export interface BannerSlide {
  id: string;
  src: string;
  alt: string;
}

export const BANNER_SLIDES: BannerSlide[] = [
  {
    id: "showcase",
    src: "/banners/banner.jpg",
    alt: "Habentech Electronics Showcase",
  },
  {
    id: "phones",
    src: "/banners/phones.jpg",
    alt: "Habentech Mobile Collection",
  },
  {
    id: "laptops",
    src: "/banners/laptops.jpg",
    alt: "Habentech Laptops Collection",
  },
  // Add more slides here as additional unique banner images are generated:
  // { id: "tablets", src: "/banners/tablets.jpg", alt: "Habentech Tablets Collection" },
  // { id: "monitors", src: "/banners/monitors.jpg", alt: "Habentech Monitors Collection" },
  // { id: "accessories", src: "/banners/accessories.jpg", alt: "Habentech Accessories Collection" },
];

const ROTATE_INTERVAL_MS = 5500;

export default function PromoBanner() {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % BANNER_SLIDES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  return (
    <section
      className="promo-banner"
      aria-label="Promotion"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Background slide images with slow crossfade animation */}
      <div className="promo-banner__slides" aria-hidden="true">
        {BANNER_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <img
              key={slide.id}
              src={slide.src}
              alt={slide.alt}
              className={`promo-banner__image ${isActive ? "promo-banner__image--active" : ""}`}
              loading={index === 0 ? "eager" : "lazy"}
              onError={(e) => {
                // Fallback to first slide if a banner image hasn't been generated/added yet
                if (slide.src !== "/banners/phones.jpg") {
                  (e.currentTarget as HTMLImageElement).src = "/banners/phones.jpg";
                }
              }}
            />
          );
        })}
      </div>

      {/* Static gradient overlay for text legibility and dark theme integration */}
      <div className="promo-banner__overlay" />

      {/* Static text content: does NOT animate or move when images crossfade */}
      <div className="promo-banner__content">
        <h2 className="promo-banner__title">{t("home.heroTitle")}</h2>
        <p className="promo-banner__subtitle">{t("home.heroSubtitle")}</p>
      </div>

      {/* Slide indicators (dots) */}
      <div className="promo-banner__dots" role="tablist" aria-label="Banner slides">
        {BANNER_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Slide ${index + 1}`}
              className={`promo-banner__dot ${isActive ? "promo-banner__dot--active" : ""}`}
              onClick={() => setActiveIndex(index)}
            />
          );
        })}
      </div>
    </section>
  );
}
