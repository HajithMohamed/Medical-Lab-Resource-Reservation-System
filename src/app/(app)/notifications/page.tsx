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
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Activity & Alerts"
        title="Notifications"
        description="Stay updated on your reservations, equipment maintenance, and availability alerts."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl border-card-edge bg-card hover:bg-canvas text-navy font-bold text-xs gap-2"
          >
            <Link href="/notifications/settings">
              <Settings className="size-3.5" />
              <span>Preferences</span>
            </Link>
          </Button>
        }
      />

      {/* Tabs navigation */}
      <div className="flex items-center gap-4 border-b border-line pb-px">
        <Link
          href="/notifications?tab=inbox"
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
            activeTab === "inbox"
              ? "border-teal text-teal"
              : "border-transparent text-muted hover:text-navy"
          }`}
        >
          <Inbox className="size-4" />
          <span>Inbox</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {userCanWatch && (
          <Link
            href="/notifications?tab=alerts"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors -mb-px ${
              activeTab === "alerts"
                ? "border-teal text-teal"
                : "border-transparent text-muted hover:text-navy"
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
