"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Store, ShoppingBag, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const isVendorStore = pathname.startsWith("/s/");
  const shopSlug = isVendorStore ? pathname.split("/")[2] : null;

  const items = isVendorStore && shopSlug
    ? [
        {
          href: `/s/${shopSlug}`,
          label: t("nav.storeHome"),
          icon: Store,
          active: pathname === `/s/${shopSlug}`,
        },
        {
          href: `/s/${shopSlug}/orders`,
          label: t("nav.orders"),
          icon: ShoppingBag,
          active: pathname === `/s/${shopSlug}/orders`,
        },
        {
          href: "/",
          label: t("nav.hub"),
          icon: Compass,
          active: false,
        },
        {
          href: "/admin",
          label: t("nav.vendor"),
          icon: Sparkles,
          active: pathname.startsWith("/admin"),
        },
      ]
    : [
        {
          href: "/",
          label: t("nav.explore"),
          icon: Compass,
          active: pathname === "/" || pathname === "/explore",
        },
        {
          href: "/#verified-stores",
          label: t("nav.stores"),
          icon: Store,
          active: false,
        },
        {
          href: "/orders",
          label: t("nav.orders"),
          icon: ShoppingBag,
          active: pathname === "/orders",
        },
        {
          href: "/admin",
          label: t("nav.vendor"),
          icon: Sparkles,
          active: pathname.startsWith("/admin"),
        },
      ];

  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.active;
        return (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`bottom-nav__item ${isActive ? "bottom-nav__item--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
            {isActive && <span className="bottom-nav__label">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
