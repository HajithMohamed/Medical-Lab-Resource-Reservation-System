import * as React from "react";
import Link from "next/link";
import fs from "node:fs";
import path from "node:path";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { CalendarSearch, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { labToday, labDayStart, addLabDays, getLabTimeZone, formatLabTime } from "@/lib/time";
import { calendarOptionsFor } from "@/lib/permissions";
import { getSiteDay, getResourceWeek, listCalendarOptions } from "@/services/calendar";
import { PrecisionCalendarView } from "@/components/calendar/precision-calendar-view";

export const metadata = {
  title: "Calendar | BenchBook",
  description: "Live availability across laboratory instruments, cabinets, rooms, and vehicles.",
};

interface CalendarPageProps {
  searchParams?: Promise<{
    view?: string;
    date?: string;
    site?: string;
    category?: string;
    resource?: string;
  }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const user = await requireUser();
  const zone = getLabTimeZone();
  const zoneCity = zone.split("/").pop()?.replace(/_/g, " ") ?? zone;

  const resolvedParams = searchParams ? await searchParams : {};

  // 1. Resolve View (day | week, default day)
  const view: "day" | "week" = resolvedParams.view === "week" ? "week" : "day";

  // 2. Resolve Date (YYYY-MM-DD, default today in lab zone)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const dateParam = resolvedParams.date;
  const selectedDate = dateParam && dateRegex.test(dateParam) ? dateParam : labToday(zone);

  // 3. Load Options (Sites, Categories)
  const { sites, categories } = await listCalendarOptions();

  // Resolve Site (default user's site, admins: first site by name)
  let selectedSiteId = sites[0]?.id ?? "";
  if (resolvedParams.site && sites.some((s) => s.id === resolvedParams.site)) {
    selectedSiteId = resolvedParams.site;
  } else if (user.siteId && sites.some((s) => s.id === user.siteId)) {
    selectedSiteId = user.siteId;
  }

  // Load resources for the resolved site
  const { resources: siteResources } = await listCalendarOptions(selectedSiteId);

  // 4. Role permissions check
  const { canBookHere, canBlockHere } = calendarOptionsFor(user, selectedSiteId);

  // Check if /maintenance/new route exists (hidden until P9)
  const maintenanceRoutePath = path.join(process.cwd(), "src/app/(app)/maintenance/new/page.tsx");
  const hasMaintenanceRoute = fs.existsSync(maintenanceRoutePath);
  const showBlockTime = canBlockHere && hasMaintenanceRoute;

  // 5. Category (Day view) & Resource (Week view) defaults
  const selectedCategoryId =
    resolvedParams.category && categories.some((c) => c.id === resolvedParams.category)
      ? resolvedParams.category
      : undefined;

  const selectedResourceId =
    resolvedParams.resource && siteResources.some((r) => r.id === resolvedParams.resource)
      ? resolvedParams.resource
      : siteResources[0]?.id;

  // 6. Navigation Date strings
  const todayDate = labToday(zone);
  let prevDate = "";
  let nextDate = "";
  let formattedDate = "";

  if (view === "day") {
    prevDate = addLabDays(selectedDate, -1, zone);
    nextDate = addLabDays(selectedDate, 1, zone);
    const dayStartTz = new TZDate(labDayStart(selectedDate, zone), zone);
    formattedDate = format(dayStartTz, "EEEE d MMMM yyyy");
  } else {
    prevDate = addLabDays(selectedDate, -7, zone);
    nextDate = addLabDays(selectedDate, 7, zone);
    const dayStartTz = new TZDate(labDayStart(selectedDate, zone), zone);
    formattedDate = `Week of ${format(dayStartTz, "EEEE d MMMM yyyy")}`;
  }

  // 7. Load Data for the Active View
  let dayData = null;
  let weekData = null;
  let nowMs = 0;

  if (view === "day") {
    const rawDay = await getSiteDay(user.id, selectedSiteId, selectedDate, selectedCategoryId);
    nowMs = rawDay.nowMs;
    const dayTz = new TZDate(rawDay.dayStart, zone);

    dayData = {
      site: rawDay.site,
      dayStart: rawDay.dayStart.toISOString(),
      dayEnd: rawDay.dayEnd.toISOString(),
      dateString: rawDay.dateString,
      resources: rawDay.resources,
      reservations: rawDay.reservations,
      weekday: dayTz.getDay(),
      isToday: selectedDate === todayDate,
    };
  } else {
    if (selectedResourceId) {
      const rawWeek = await getResourceWeek(user.id, selectedResourceId, selectedDate);

      nowMs = rawWeek.nowMs;
      weekData = {
        resource: rawWeek.resource,
        weekStart: rawWeek.weekStart.toISOString(),
        weekEnd: rawWeek.weekEnd.toISOString(),
        mondayDateString: rawWeek.mondayDateString,
        days: rawWeek.days.map((d) => {
          const tz = new TZDate(d.dayStart, zone);
          return {
            dateString: d.dateString,
            dayStart: d.dayStart.toISOString(),
            dayEnd: d.dayEnd.toISOString(),
            dayFormatted: format(tz, "EEE d MMM"),
            weekday: tz.getDay(),
            isToday: d.isToday,
          };
        }),
        reservations: rawWeek.reservations,
      };
    }
  }

  const updatedAt = formatLabTime(new Date(nowMs), zone);

  return (
    <div className="space-y-4">
      {/* PageHeader with Role-based Description and Buttons */}
      <PageHeader
        eyebrow="Workspace / Calendar"
        title="Calendar"
        description={
          canBookHere
            ? `Click a free slot to book it. Times are ${zoneCity} time.`
            : `View bookings across the network. Times are ${zoneCity} time.`
        }
        actions={
          <div className="flex items-center gap-2">
            {canBookHere && (
              <Button
                asChild
                size="sm"
                className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-sm hover:opacity-95"
              >
                <Link href="/book">
                  <CalendarSearch className="size-3.5 mr-1.5" />
                  <span>Book a resource</span>
                </Link>
              </Button>
            )}
            {showBlockTime && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-card-edge bg-card hover:bg-canvas text-xs font-semibold text-navy"
              >
                <Link
                  href={`/maintenance/new?siteId=${selectedSiteId}&returnTo=${encodeURIComponent(
                    `/calendar?view=${view}&date=${selectedDate}&site=${selectedSiteId}${
                      view === "day" && selectedCategoryId ? `&category=${selectedCategoryId}` : ""
                    }${view === "week" && selectedResourceId ? `&resource=${selectedResourceId}` : ""}`,
                  )}`}
                >
                  <Wrench className="size-3.5 mr-1.5" />
                  <span>Block time</span>
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Main Precision Calendar View Component */}
      <PrecisionCalendarView
        user={{
          id: user.id,
          name: user.name,
          role: user.role,
          siteId: user.siteId,
        }}
        view={view}
        date={selectedDate}
        formattedDate={formattedDate}
        prevDate={prevDate}
        nextDate={nextDate}
        todayDate={todayDate}
        selectedSiteId={selectedSiteId}
        selectedCategoryId={selectedCategoryId}
        selectedResourceId={selectedResourceId}
        sites={sites}
        categories={categories}
        siteResources={siteResources}
        canBookHere={canBookHere}
        canBlockHere={canBlockHere}
        updatedAt={updatedAt}
        zoneCity={zoneCity}
        nowMs={nowMs}
        dayData={dayData}
        weekData={weekData}
      />
    </div>
  );
}
