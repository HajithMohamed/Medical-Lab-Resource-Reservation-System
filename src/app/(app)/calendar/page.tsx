import * as React from "react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";

export const metadata = {
  title: "Calendar",
};

export default async function CalendarPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Calendar - coming in feature/calendar" />
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <p className="text-base font-medium">
          Calendar view will be implemented in the next feature branch.
        </p>
      </div>
    </div>
  );
}
