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
      <div className="flex items-center justify-between text-xs text-muted px-1">
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
            className="h-8 text-xs gap-1.5 rounded-xl border-card-edge bg-card text-navy font-bold hover:bg-canvas"
          >
            <CheckCheck className="size-3.5 text-teal" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* List items */}
      <div className="divide-y divide-line border border-card-edge rounded-[20px] overflow-hidden bg-card shadow-v4">
        {items.map((item) => {
          const isUnread = !item.readAt;
          return (
            <div
              key={item.id}
              onClick={() => router.push(item.link)}
              className={`p-4 sm:p-5 flex items-start gap-4 hover:bg-mint/30 cursor-pointer transition-colors ${
                isUnread ? "bg-mint/15 border-l-4 border-l-teal" : ""
              }`}
            >
              <div className="mt-1 shrink-0">
                <div
                  className={`size-9 rounded-xl flex items-center justify-center ${
                    isUnread
                      ? "bg-teal-soft text-teal font-extrabold"
                      : "bg-canvas text-muted border border-card-edge"
                  }`}
                >
                  <Bell className="size-4" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`text-sm ${
                      isUnread ? "font-bold text-navy" : "font-semibold text-ink"
                    }`}
                  >
                    {item.title}
                  </h4>
                  {isUnread && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-soft text-teal border border-teal-soft">
                      Unread
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted mt-1 leading-relaxed">{item.body}</p>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-faint">
                  <span>
                    {formatClientLabDate(item.createdAt)} at {formatClientLabTime(item.createdAt)}
                  </span>
                  <span>•</span>
                  <span className="text-teal font-bold hover:underline flex items-center gap-1">
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
                    className="h-8 px-2.5 text-xs text-muted hover:text-teal hover:bg-mint/50 rounded-xl"
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
