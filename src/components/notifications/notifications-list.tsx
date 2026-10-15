"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PaginationControls } from "@/components/pagination-controls";
import { formatClientLabDate, formatClientLabTime } from "@/lib/client-time";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notifications";
import { useNotifications } from "./notifications-provider";
import type { NotificationListItem } from "@/services/notifications";

export interface NotificationsListProps {
  initialItems: NotificationListItem[];
  total: number;
  page: number;
  totalPages: number;
  unreadCount: number;
  pageSize?: number;
}

export function NotificationsList({
  initialItems,
  total,
  page,
  totalPages,
  unreadCount: initialUnreadCount,
  pageSize = 15,
}: NotificationsListProps) {
  const router = useRouter();
  const { refresh } = useNotifications();
  const [markedReadIds, setMarkedReadIds] = React.useState<Set<string>>(() => new Set());
  const [allMarkedRead, setAllMarkedRead] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const items = initialItems.map((item) =>
    allMarkedRead || markedReadIds.has(item.id)
      ? { ...item, readAt: item.readAt ?? new Date() }
      : item,
  );

  const locallyReadCount = initialItems.filter(
    (item) => !item.readAt && (allMarkedRead || markedReadIds.has(item.id)),
  ).length;
  const unreadCount = allMarkedRead ? 0 : Math.max(0, initialUnreadCount - locallyReadCount);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await markNotificationReadAction(id);
      setMarkedReadIds((prev) => new Set(prev).add(id));
      refresh();
      router.refresh();
    });
  };

  const handleMarkAllRead = async () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setAllMarkedRead(true);
      refresh();
      router.refresh();
    });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Your inbox is clear"
        description="You have no notifications right now. System updates, cancellation notices, and alert triggers will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex items-center justify-between text-xs text-[#94a3b8] px-1">
        <span>
          Showing {items.length} of {total} notification{total === 1 ? "" : "s"}
          {unreadCount > 0 && ` (${unreadCount} unread)`}
        </span>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="h-8 text-xs gap-1.5 border-[#334155] bg-[#141c2b] text-[#dbe2f8] hover:text-white hover:bg-[#222a3a]"
          >
            <CheckCheck className="size-3.5 text-[#6cd8cb]" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* List items */}
      <div className="divide-y divide-[#334155]/60 border border-[#334155] rounded-xl overflow-hidden bg-[#141c2b]">
        {items.map((item) => {
          const isUnread = !item.readAt;
          return (
            <div
              key={item.id}
              onClick={() => router.push(item.link)}
              className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-[#1a2335] cursor-pointer transition-colors ${
                isUnread ? "bg-[#182235] border-l-4 border-l-[#6cd8cb]" : ""
              }`}
            >
              <div className="mt-1 shrink-0">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center border ${
                    isUnread
                      ? "bg-[#6cd8cb]/10 border-[#6cd8cb]/40 text-[#6cd8cb]"
                      : "bg-[#1e293b] border-[#334155] text-[#94a3b8]"
                  }`}
                >
                  <Bell className="size-4" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`text-sm tracking-tight ${
                      isUnread ? "font-bold text-white" : "font-medium text-[#cbd5e1]"
                    }`}
                  >
                    {item.title}
                  </h4>
                  {isUnread && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#6cd8cb]/20 text-[#6cd8cb] border border-[#6cd8cb]/30 uppercase tracking-wide">
                      Unread
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">{item.body}</p>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-[#64748b] font-mono">
                  <span>
                    {formatClientLabDate(item.createdAt)} at {formatClientLabTime(item.createdAt)}
                  </span>
                  <span>•</span>
                  <span className="text-[#6cd8cb] hover:underline flex items-center gap-1">
                    View details <ExternalLink className="size-3" />
                  </span>
                </div>
              </div>

              {isUnread && (
                <div className="shrink-0 self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleMarkRead(item.id, e)}
                    disabled={isPending}
                    className="h-8 px-2.5 text-xs text-[#94a3b8] hover:text-[#6cd8cb] hover:bg-[#222a3a]"
                    title="Mark as read"
                  >
                    <CheckCheck className="size-4" />
                    <span className="sr-only">Mark as read</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pt-2">
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={pageSize}
            basePath="/notifications"
            itemLabel="notifications"
          />
        </div>
      )}
    </div>
  );
}
