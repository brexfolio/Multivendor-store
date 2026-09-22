"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import BottomNavigation from "@/components/store/BottomNavigation";
import { useDeepLink } from "@/lib/useDeepLink";

const PRODUCT_DETAIL_PATTERN = /^\/products\/[^/]+$/;

export default function StoreLayout({ children }: { children: ReactNode }) {
  useDeepLink();
  const pathname = usePathname();
  const hideBottomNav = PRODUCT_DETAIL_PATTERN.test(pathname);

  return (
    <>
      {children}
      {!hideBottomNav && <BottomNavigation />}
    </>
  );
}
