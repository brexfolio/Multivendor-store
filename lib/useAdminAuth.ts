"use client";

import { useEffect, useState } from "react";
import { getInitData } from "./telegram";

export type AdminAuthState = "checking" | "authorized" | "unauthorized";

/** Verifies the current Telegram user is the configured admin, server-side. */
export function useAdminAuth(): AdminAuthState {
  const [authState, setAuthState] = useState<AdminAuthState>("checking");

  useEffect(() => {
    const initData = getInitData();
    fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ init_data: initData }),
    })
      .then((res) => setAuthState(res.ok ? "authorized" : "unauthorized"))
      .catch(() => setAuthState("unauthorized"));
  }, []);

  return authState;
}
