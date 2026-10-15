import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings, Inbox, Eye } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canViewNotifications, canWatchResource } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { listMyNotifications, countUnread } from "@/services/notifications";
import { listMyWatches } from "@/services/watches";
import { NotificationsList } from "@/components/notifications/notifications-list";
import { AlertsList } from "@/components/notifications/alerts-list";

export const metadata = {
  title: "Notifications | BenchBook",
  description: "View and manage your in-app notifications and availability alerts.",
};

interface NotificationsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const user = await requireUser();

  if (!canViewNotifications(user)) {
    redirect("/calendar");
  }

  const rawParams = searchParams ? await searchParams : {};
  const getParam = (key: string): string | undefined => {
    const val = rawParams[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const rawTab = getParam("tab");
  const pageParam = getParam("page");
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const pageSize = 15;

  const userCanWatch = canWatchResource(user);
  const activeTab = rawTab === "alerts" && userCanWatch ? "alerts" : "inbox";

  const [inboxData, unreadCount, myWatches] = await Promise.all([
    activeTab === "inbox"
      ? listMyNotifications(user, { page, pageSize })
      : { items: [], total: 0, page: 1, totalPages: 1 },
    countUnread(user),
    activeTab === "alerts" && userCanWatch ? listMyWatches(user) : [],
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activity & Alerts"
        title="Notifications"
        description="Stay updated on your reservations, equipment maintenance, and availability alerts."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#334155] bg-[#141c2b] text-[#94a3b8] hover:text-white hover:bg-[#1a2335] text-xs gap-2"
          >
            <Link href="/notifications/settings">
              <Settings className="size-3.5" />
              <span>Preferences</span>
            </Link>
          </Button>
        }
      />

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-[#334155]/60 pb-px">
        <Link
          href="/notifications?tab=inbox"
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === "inbox"
              ? "border-[#6cd8cb] text-[#6cd8cb]"
              : "border-transparent text-[#94a3b8] hover:text-white hover:border-[#334155]"
          }`}
        >
          <Inbox className="size-4" />
          <span>Inbox</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-mono font-bold bg-[#6cd8cb] text-[#0b0f17]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {userCanWatch && (
          <Link
            href="/notifications?tab=alerts"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "alerts"
                ? "border-[#6cd8cb] text-[#6cd8cb]"
                : "border-transparent text-[#94a3b8] hover:text-white hover:border-[#334155]"
            }`}
          >
            <Eye className="size-4" />
            <span>My Alerts</span>
          </Link>
        )}
      </div>

      {/* Tab content */}
      {activeTab === "inbox" ? (
        <NotificationsList
          initialItems={inboxData.items}
          total={inboxData.total}
          page={inboxData.page}
          totalPages={inboxData.totalPages}
          unreadCount={unreadCount}
          pageSize={pageSize}
        />
      ) : (
        <AlertsList watches={myWatches} />
      )}
    </div>
  );
}
