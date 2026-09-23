"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import BottomNavigation from "@/components/store/BottomNavigation";

const VENDOR_PRODUCT_DETAIL_PATTERN = /^\/s\/[^/]+\/products\/[^/]+$/;

export default function VendorStoreLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideBottomNav = VENDOR_PRODUCT_DETAIL_PATTERN.test(pathname);

  return (
    <>
      {children}
      {!hideBottomNav && <BottomNavigation />}
    </>
  );
}
