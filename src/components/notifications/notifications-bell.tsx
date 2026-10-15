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
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications, no unread";

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
          className="relative inline-flex items-center justify-center rounded-lg p-2 text-[#94a3b8] hover:text-white hover:bg-[#222a3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6cd8cb] transition-colors"
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f43f5e] px-1 text-[10px] font-bold text-white shadow-xs"
              aria-hidden="true"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 bg-[#0f172a] text-[#f1f5f9] border border-[#334155] shadow-xl rounded-xl z-50 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#334155] bg-[#1e293b]/70">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-[#222a3a] text-[#6cd8cb] rounded border border-[#6cd8cb]/30">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-[#94a3b8] hover:text-[#6cd8cb] transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded"
              >
                <CheckCheck className="size-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <Link
              href="/notifications/settings"
              onClick={() => setOpen(false)}
              className="p-1 text-[#94a3b8] hover:text-white rounded transition-colors"
              title="Notification settings"
            >
              <Settings className="size-3.5" />
            </Link>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto divide-y divide-[#334155]/60">
          {latestItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#94a3b8]">
              No notifications yet.
            </div>
          ) : (
            latestItems.slice(0, 8).map((item) => {
              const isUnread = !item.readAt;
              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`px-4 py-3 hover:bg-[#1e293b] cursor-pointer transition-colors relative flex items-start gap-2.5 ${
                    isUnread ? "bg-[#141d2e]" : ""
                  }`}
                >
                  <div className="mt-1 shrink-0">
                    {isUnread ? (
                      <span className="size-2 rounded-full bg-[#6cd8cb] block ring-4 ring-[#6cd8cb]/20" />
                    ) : (
                      <span className="size-2 rounded-full bg-transparent block" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs truncate ${
                        isUnread ? "font-semibold text-white" : "text-[#cbd5e1]"
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#94a3b8] line-clamp-2 mt-0.5 leading-relaxed">
                      {item.body}
                    </p>
                    <p className="text-[10px] text-[#64748b] mt-1 font-mono">
                      {formatClientLabDate(item.createdAt)} • {formatClientLabTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2 border-t border-[#334155] bg-[#1e293b]/70 flex items-center justify-between text-xs">
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="w-full text-center py-1 text-xs font-medium text-[#6cd8cb] hover:text-[#a5f3fc] transition-colors"
          >
            See all notifications &rarr;
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
