"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CALENDAR_REFRESH_SECONDS } from "@/config/rules";

/**
 * Periodically refreshes the active route while the browser tab is visible.
 * simple polling: works on any host, no socket server needed
 */
export function useAutoRefresh(intervalSeconds: number = CALENDAR_REFRESH_SECONDS) {
  const router = useRouter();

  React.useEffect(() => {
    const intervalMs = intervalSeconds * 1000;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        router.refresh();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [router, intervalSeconds]);
}
