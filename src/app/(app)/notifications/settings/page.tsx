import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canViewNotifications } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { getMyPreferences } from "@/services/notifications";
import { NotificationSettingsForm } from "@/components/notifications/notification-settings-form";

export const metadata = {
  title: "Notification Preferences | BenchBook",
  description: "Customize your in-app notification preferences.",
};

export default async function NotificationSettingsPage() {
  const user = await requireUser();

  if (!canViewNotifications(user)) {
    redirect("/calendar");
  }

  const preferences = await getMyPreferences(user);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Preferences"
        description="Configure which events and system updates you want to receive in your in-app feed."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-card-edge bg-card text-navy hover:text-navy hover:bg-mint text-xs font-semibold rounded-xl gap-2 shadow-2xs"
          >
            <Link href="/notifications">
              <ArrowLeft className="size-3.5" />
              <span>Back to Notifications</span>
            </Link>
          </Button>
        }
      />

      <NotificationSettingsForm initialPreferences={preferences} />
    </div>
  );
}
