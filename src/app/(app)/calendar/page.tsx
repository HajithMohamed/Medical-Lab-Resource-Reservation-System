import * as React from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PrecisionCalendarView } from "@/components/calendar/precision-calendar-view";

export const metadata = {
  title: "Live Schedule | BenchBook Pro",
  description:
    "Precision Clinical Operations — Live timetable, conflict engine, and equipment allocation.",
};

export default async function CalendarPage() {
  const user = await requireUser();

  const resources = await db.resource.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      location: true,
      category: {
        select: {
          name: true,
          iconKey: true,
        },
      },
      site: {
        select: {
          name: true,
        },
      },
      section: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <PrecisionCalendarView
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        siteName: user.siteName,
      }}
      resources={resources}
    />
  );
}
