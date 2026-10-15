"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "./notifications-provider";
import { formatClientLabDate, formatClientLabTime } from "@/lib/client-time";

export function NotificationsBell() {
  const router = useRouter();
  const { unreadCount, latestItems, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = React.useState(false);

  const accessibleLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications, no unread";

  const handleItemClick = async (item: { id: string; link: string; readAt: Date | null }) => {
    if (!item.readAt) {
      await markRead(item.id);
    }
    setOpen(false);
    router.push(item.link);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={accessibleLabel}
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-card-edge bg-card text-navy hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus shadow-2xs transition-colors cursor-pointer"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-strong border-2 border-card"
              aria-hidden="true"
            />
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-card text-ink border border-card-edge shadow-v4 rounded-2xl z-50 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-canvas">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-navy">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] font-bold bg-amber-soft text-amber rounded-full border border-amber-line tab">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-muted hover:text-teal transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <Link
              href="/notifications/settings"
              onClick={() => setOpen(false)}
              className="p-1 text-muted hover:text-navy rounded transition-colors"
              title="Notification settings"
            >
              <Settings className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-line">
          {latestItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted">No notifications yet.</div>
          ) : (
            latestItems.slice(0, 8).map((item) => {
              const isUnread = !item.readAt;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`px-4 py-3 hover:bg-mint cursor-pointer transition-colors relative flex items-start gap-2.5 ${
                    isUnread ? "bg-teal-soft/40" : ""
                  }`}
                >
                  <div className="mt-1 shrink-0">
                    {isUnread ? (
                      <span className="size-2 rounded-full bg-teal block ring-3 ring-teal-soft" />
                    ) : (
                      <span className="size-2 rounded-full bg-transparent block" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs truncate ${
                        isUnread ? "font-bold text-navy" : "text-ink"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[11.5px] text-muted line-clamp-2 mt-0.5 leading-relaxed">
                      {item.body}
                    </p>
                    <p className="text-[10px] text-faint mt-1 tab">
                      {formatClientLabDate(item.createdAt)} • {formatClientLabTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2.5 border-t border-line bg-canvas flex items-center justify-between text-xs">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="w-full text-center py-1 text-xs font-bold text-teal-deep hover:text-teal transition-colors"
          >
            See all notifications &rarr;
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
