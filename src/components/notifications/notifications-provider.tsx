"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NOTIFICATION_POLL_SECONDS, NOTIFICATION_TOAST_MAX } from "@/config/rules";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import type { NotificationListItem } from "@/services/notifications";

const BACKOFF_INTERVALS = [30, 60, 120];

export interface NotificationsContextValue {
  unreadCount: number;
  latestItems: NotificationListItem[];
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = React.createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const ctx = React.useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return ctx;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [latestItems, setLatestItems] = React.useState<NotificationListItem[]>([]);
  const [announcement, setAnnouncement] = React.useState<string>("");

  const initialLoadDone = React.useRef(false);
  const lastPollTimeRef = React.useRef<string | null>(null);
  const backoffIndexRef = React.useRef(0);
  const timeoutIdRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollRef = React.useRef<() => Promise<void>>(async () => {});

  const clearTimer = () => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };

  const poll = React.useCallback(async () => {
    // Only poll if document is visible
    if (typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }

    try {
      const url =
        initialLoadDone.current && lastPollTimeRef.current
          ? `/api/notifications/poll?after=${encodeURIComponent(lastPollTimeRef.current)}`
          : `/api/notifications/poll`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Poll returned ${res.status}`);
      }

      const data: { unread: number; items: NotificationListItem[] } = await res.json();
      lastPollTimeRef.current = new Date().toISOString();
      backoffIndexRef.current = 0; // Reset error backoff

      setUnreadCount(data.unread);

      if (!initialLoadDone.current) {
        // Initial load: do not toast existing notifications
        initialLoadDone.current = true;
        setLatestItems(data.items);
      } else {
        const newItems = data.items;
        if (newItems.length > 0) {
          // Announce to screen readers
          setAnnouncement(`${newItems.length} new notification${newItems.length === 1 ? "" : "s"}`);

          // Update latest items list
          setLatestItems((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const fresh = newItems.filter((i) => !existingIds.has(i.id));
            return [...fresh, ...prev].slice(0, 8);
          });

          // Show sonner toasts: up to NOTIFICATION_TOAST_MAX individual toasts
          const toastItems = newItems.slice(0, NOTIFICATION_TOAST_MAX);
          for (const item of toastItems) {
            toast(item.title, {
              description: item.body,
              action: {
                label: "View",
                onClick: () => {
                  router.push(item.link);
                },
              },
            });
          }

          if (newItems.length > NOTIFICATION_TOAST_MAX) {
            const remainder = newItems.length - NOTIFICATION_TOAST_MAX;
            toast(`and ${remainder} more notification${remainder === 1 ? "" : "s"}`, {
              action: {
                label: "See all",
                onClick: () => {
                  router.push("/notifications");
                },
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn("[notifications] Polling error, backing off:", err);
      // Increment backoff on error
      backoffIndexRef.current = Math.min(backoffIndexRef.current + 1, BACKOFF_INTERVALS.length - 1);
    } finally {
      // Schedule next poll
      clearTimer();
      const nextDelaySeconds =
        backoffIndexRef.current > 0
          ? BACKOFF_INTERVALS[backoffIndexRef.current - 1]
          : NOTIFICATION_POLL_SECONDS;

      timeoutIdRef.current = setTimeout(() => {
        void pollRef.current();
      }, nextDelaySeconds * 1000);
    }
  }, [router]);

  React.useEffect(() => {
    pollRef.current = poll;
  }, [poll]);

  const refresh = React.useCallback(async () => {
    clearTimer();
    await poll();
  }, [poll]);

  const markRead = React.useCallback(async (id: string) => {
    await markNotificationReadAction(id);
    setUnreadCount((c) => Math.max(0, c - 1));
    setLatestItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, readAt: new Date() } : item)),
    );
  }, []);

  const markAllRead = React.useCallback(async () => {
    await markAllNotificationsReadAction();
    setUnreadCount(0);
    setLatestItems((prev) => prev.map((item) => ({ ...item, readAt: new Date() })));
  }, []);

  React.useEffect(() => {
    // Initial poll
    poll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        poll();
      } else {
        clearTimer();
      }
    };

    const handleFocus = () => {
      poll();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [poll]);

  return (
    <NotificationsContext.Provider
      value={{
        unreadCount,
        latestItems,
        refresh,
        markRead,
        markAllRead,
      }}
    >
      {/* Screen reader announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      {children}
    </NotificationsContext.Provider>
  );
}
