"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CALENDAR_REFRESH_SECONDS } from "@/config/rules";

/**
 * Periodically refreshes the active route while the browser tab is visible.
 * Runs on a quiet, predictable interval (CALENDAR_REFRESH_SECONDS).
 */
export function useAutoRefresh(intervalSeconds: number = CALENDAR_REFRESH_SECONDS) {
  const router = useRouter();
  const routerRef = React.useRef(router);

  React.useEffect(() => {
    routerRef.current = router;
  }, [router]);

  React.useEffect(() => {
    if (!intervalSeconds || intervalSeconds <= 0) return;
    const intervalMs = Math.max(intervalSeconds, 60) * 1000;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        routerRef.current.refresh();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalSeconds]);
}
