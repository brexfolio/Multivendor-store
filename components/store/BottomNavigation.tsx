"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import HomeIcon from "./icons/HomeIcon";
import SellIcon from "./icons/SellIcon";
import FavoritesIcon from "./icons/FavoritesIcon";
import OrdersIcon from "./icons/OrdersIcon";
import { useLanguage } from "@/lib/i18n";

const ITEMS = [
  { href: "/", key: "home", icon: HomeIcon },
  { href: "/sell-device", key: "sell", icon: SellIcon },
  { href: "/favorites", key: "favorites", icon: FavoritesIcon },
  { href: "/orders", key: "orders", icon: OrdersIcon },
];

const STRETCH_MS = 160;
const STRETCH_TRANSITION =
  "transform 0.16s cubic-bezier(0.4, 0, 1, 1), width 0.16s cubic-bezier(0.4, 0, 1, 1)";
const CONTRACT_TRANSITION =
  "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), width 0.22s cubic-bezier(0.4, 0, 0.2, 1)";

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const activeIndex = ITEMS.findIndex((item) => item.href === pathname);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const rectRef = useRef<{ left: number; width: number } | null>(null);
  const contractTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    let raf = 0;

    const run = () => {
      const indicator = indicatorRef.current;
      const target = itemRefs.current[activeIndex];
      if (!indicator || !target) {
        raf = requestAnimationFrame(run);
        return;
      }

      if (contractTimer.current) {
        clearTimeout(contractTimer.current);
        contractTimer.current = null;
      }

      const newRect = { left: target.offsetLeft, width: target.offsetWidth };
      const prevRect = rectRef.current;
      rectRef.current = newRect;

      if (!prevRect) {
        indicator.style.transition = "none";
        indicator.style.transform = `translateX(${newRect.left}px)`;
        indicator.style.width = `${newRect.width}px`;
        return;
      }

      if (prevRect.left === newRect.left && prevRect.width === newRect.width) {
        return;
      }

      const stretchLeft = Math.min(prevRect.left, newRect.left);
      const stretchRight = Math.max(prevRect.left + prevRect.width, newRect.left + newRect.width);

      indicator.style.transition = STRETCH_TRANSITION;
      indicator.style.transform = `translateX(${stretchLeft}px)`;
      indicator.style.width = `${stretchRight - stretchLeft}px`;

      contractTimer.current = setTimeout(() => {
        const el = indicatorRef.current;
        if (!el) return;
        el.style.transition = CONTRACT_TRANSITION;
        el.style.transform = `translateX(${newRect.left}px)`;
        el.style.width = `${newRect.width}px`;
      }, STRETCH_MS);
    };

    run();
    return () => cancelAnimationFrame(raf);
  }, [activeIndex]);

  return (
    <nav className="bottom-nav" aria-label="Primary">
      <div ref={indicatorRef} className="bottom-nav__indicator" aria-hidden="true" />
      {ITEMS.map(({ href, key, icon: Icon }, index) => {
        const label = t(`nav.${key}`);
        const active = index === activeIndex;
        return (
          <Link
            key={href}
            href={href}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            className={`bottom-nav__item ${active ? "bottom-nav__item--active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} />
            {active && <span className="bottom-nav__label">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
