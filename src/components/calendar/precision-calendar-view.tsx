"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Calendar as CalendarIcon,
  Layers,
  Sparkles,
} from "lucide-react";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import {
  CALENDAR_ROW_MINUTES,
  CALENDAR_SCROLL_TO_HOUR,
  STANDARD_WEEKDAYS,
  STANDARD_DAY_START_HOUR,
  STANDARD_DAY_END_HOUR,
} from "@/config/rules";
import { placeOnDay, rowLabel } from "@/lib/calendar-layout";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import type { CalendarResource, CalendarReservation } from "@/services/calendar";

export interface PrecisionCalendarViewProps {
  user: {
    id: string;
    name: string;
    role: string;
    siteId?: string | null;
  };
  view: "day" | "week";
  date: string;
  formattedDate: string;
  prevDate: string;
  nextDate: string;
  todayDate: string;
  selectedSiteId: string;
  selectedCategoryId?: string;
  selectedResourceId?: string;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  siteResources: Array<{ id: string; name: string; status: string; categoryId: string }>;
  canBookHere: boolean;
  canBlockHere: boolean;
  updatedAt: string;
  zoneCity: string;
  dayData: {
    site: { id: string; name: string } | null;
    dayStart: string; // ISO
    dayEnd: string; // ISO
    dateString: string;
    resources: CalendarResource[];
    reservations: CalendarReservation[];
    weekday: number;
    isToday: boolean;
  } | null;
  weekData: {
    resource: CalendarResource | null;
    weekStart: string; // ISO
    weekEnd: string; // ISO
    mondayDateString: string;
    days: Array<{
      dateString: string;
      dayStart: string; // ISO
      dayEnd: string; // ISO
      dayFormatted: string; // "Mon 12 Oct"
      weekday: number;
      isToday: boolean;
    }>;
    reservations: CalendarReservation[];
  } | null;
}

export function PrecisionCalendarView({
  user,
  view,
  date,
  formattedDate,
  prevDate,
  nextDate,
  todayDate,
  selectedSiteId,
  selectedCategoryId,
  selectedResourceId,
  sites,
  categories,
  siteResources,
  canBookHere,
  updatedAt,
  zoneCity,
  dayData,
  weekData,
}: PrecisionCalendarViewProps) {
  // Live refresh route periodically
  useAutoRefresh();

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Scroll to CALENDAR_SCROLL_TO_HOUR on initial load
  React.useEffect(() => {
    if (containerRef.current) {
      // 7 hours * 2 rows/hour * 26px = 364px
      const targetScroll =
        ((CALENDAR_SCROLL_TO_HOUR * 60) / CALENDAR_ROW_MINUTES) * 26;
      containerRef.current.scrollTop = targetScroll;
    }
  }, []);

  // Compute current time line position (Now line)
  const [nowMs, setNowMs] = React.useState<number>(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const totalGridRows = 48; // 24 hours * 2 (30-min slots)
  const isDayView = view === "day";

  // Calculate summary metrics
  const activeResourcesCount = isDayView
    ? (dayData?.resources.filter((r) => r.status === "ACTIVE").length ?? 0)
    : weekData?.resource?.status === "ACTIVE"
      ? 1
      : 0;

  const totalResourcesCount = isDayView
    ? (dayData?.resources.length ?? 0)
    : weekData?.resource
      ? 1
      : 0;

  const oosResourcesCount = isDayView
    ? (dayData?.resources.filter((r) => r.status === "OUT_OF_SERVICE").length ?? 0)
    : weekData?.resource?.status === "OUT_OF_SERVICE"
      ? 1
      : 0;

  const totalReservationsCount = isDayView
    ? (dayData?.reservations.length ?? 0)
    : (weekData?.reservations.length ?? 0);

  const myBookingsCount = isDayView
    ? (dayData?.reservations.filter((r) => r.isMine).length ?? 0)
    : (weekData?.reservations.filter((r) => r.isMine).length ?? 0);

  // Time slot helper: converts row index (0-47) to "HH:mm"
  const getTimeString = (rowIndex: number): string => {
    const totalMinutes = rowIndex * CALENDAR_ROW_MINUTES;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* 1. OPERATIONAL SUMMARY STRIP (Clinical Precision Redesign) */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Operational Status */}
        <div className="p-3.5 rounded-xl bg-[#141c2b] border border-[#334155] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#879390] uppercase tracking-wider">
              {isDayView ? "Site Allocation" : "Resource Status"}
            </span>
            <span className="w-2 h-2 rounded-full bg-[#6cd8cb] ring-4 ring-[#6cd8cb]/20" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tabular-nums">
              {isDayView
                ? `${activeResourcesCount} / ${totalResourcesCount} Active`
                : (weekData?.resource?.name ?? "Resource")}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#94a3b8] flex justify-between">
            <span>
              {isDayView
                ? `${totalResourcesCount - activeResourcesCount} non-active`
                : `${weekData?.resource?.category.name} • ${weekData?.resource?.section.name}`}
            </span>
            {oosResourcesCount > 0 && (
              <span className="text-rose-400 font-mono text-[11px]">
                {oosResourcesCount} Out of service
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Bookings */}
        <div className="p-3.5 rounded-xl bg-[#141c2b] border border-[#334155] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#879390] uppercase tracking-wider">
              {isDayView ? "Today's Schedule" : "Week's Schedule"}
            </span>
            <CalendarIcon className="size-3.5 text-[#6cd8cb]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tabular-nums">
              {totalReservationsCount}{" "}
              <span className="text-sm font-normal text-[#94a3b8]">
                {totalReservationsCount === 1 ? "reservation" : "reservations"}
              </span>
            </span>
          </div>
          <div className="mt-1 text-xs text-[#94a3b8] flex justify-between">
            <span>{myBookingsCount > 0 ? `${myBookingsCount} booked by You` : "Network bookings"}</span>
            <span className="text-[#6cd8cb] font-mono text-[11px]">Confirmed</span>
          </div>
        </div>

        {/* Metric 3: Time & Zone */}
        <div className="p-3.5 rounded-xl bg-[#141c2b] border border-[#334155] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#879390] uppercase tracking-wider">
              Network Operating Zone
            </span>
            <Clock className="size-3.5 text-[#7bd0ff]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white tabular-nums">{zoneCity}</span>
            <span className="font-mono text-xs text-[#7bd0ff] font-semibold">
              Live
            </span>
          </div>
          <div className="mt-1 text-xs text-[#94a3b8]">
            Standard: 08:00–18:00 Mon–Fri
          </div>
        </div>

        {/* Metric 4: Role Access */}
        <div className="p-3.5 rounded-xl bg-[#141c2b] border border-[#334155] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-[#879390] uppercase tracking-wider">
              Access Mode
            </span>
            <Shield className="size-3.5 text-[#ffb77d]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-white uppercase font-mono">
              {user.role}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#94a3b8] flex justify-between">
            <span>{canBookHere ? "Booking enabled" : "Read-only access"}</span>
            <span className="font-mono text-[11px] text-slate-400">
              {user.name}
            </span>
          </div>
        </div>
      </section>

      {/* 2. TOOLBAR (Bookmarkable GET Form) */}
      <form
        method="GET"
        action="/calendar"
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs"
      >
        <input type="hidden" name="view" value={view} />
        <input type="hidden" name="date" value={date} />

        {/* Left: View Switcher & Date Navigation */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented View Switcher */}
          <div className="inline-flex rounded-lg border border-[#334155] bg-[#060e1d] p-0.5">
            <Link
              href={`/calendar?view=day&date=${date}&site=${selectedSiteId}${
                selectedCategoryId ? `&category=${selectedCategoryId}` : ""
              }`}
              aria-current={view === "day" ? "page" : undefined}
              className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                view === "day"
                  ? "bg-[#6cd8cb] text-[#003732] shadow-2xs"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              Day
            </Link>
            <Link
              href={`/calendar?view=week&date=${date}&site=${selectedSiteId}${
                selectedResourceId ? `&resource=${selectedResourceId}` : ""
              }`}
              aria-current={view === "week" ? "page" : undefined}
              className={`px-3 py-1 text-xs font-mono font-semibold rounded-md transition-colors ${
                view === "week"
                  ? "bg-[#6cd8cb] text-[#003732] shadow-2xs"
                  : "text-[#94a3b8] hover:text-white"
              }`}
            >
              Week
            </Link>
          </div>

          {/* Stepper Buttons: Prev, Today, Next */}
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?view=${view}&date=${prevDate}&site=${selectedSiteId}${
                isDayView
                  ? selectedCategoryId ? `&category=${selectedCategoryId}` : ""
                  : selectedResourceId ? `&resource=${selectedResourceId}` : ""
              }`}
              aria-label={isDayView ? "Previous day" : "Previous week"}
              className="p-1.5 rounded-lg border border-[#334155] bg-[#18202f] text-[#94a3b8] hover:text-white hover:bg-[#222a3a] transition-colors"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`/calendar?view=${view}&date=${todayDate}&site=${selectedSiteId}${
                isDayView
                  ? selectedCategoryId ? `&category=${selectedCategoryId}` : ""
                  : selectedResourceId ? `&resource=${selectedResourceId}` : ""
              }`}
              aria-label="Go to today"
              className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg border border-[#334155] bg-[#18202f] text-[#94a3b8] hover:text-white hover:bg-[#222a3a] transition-colors"
            >
              Today
            </Link>
            <Link
              href={`/calendar?view=${view}&date=${nextDate}&site=${selectedSiteId}${
                isDayView
                  ? selectedCategoryId ? `&category=${selectedCategoryId}` : ""
                  : selectedResourceId ? `&resource=${selectedResourceId}` : ""
              }`}
              aria-label={isDayView ? "Next day" : "Next week"}
              className="p-1.5 rounded-lg border border-[#334155] bg-[#18202f] text-[#94a3b8] hover:text-white hover:bg-[#222a3a] transition-colors"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>

          {/* Date Written Out */}
          <span className="font-semibold text-xs md:text-sm text-white pl-1">
            {formattedDate}
          </span>
        </div>

        {/* Right: Site, Category / Resource Selects & Updated At */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Site Select */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="site-select" className="text-xs font-mono text-[#879390]">
              Site:
            </label>
            <select
              id="site-select"
              name="site"
              defaultValue={selectedSiteId}
              onChange={(e) => e.target.form?.submit()}
              className="bg-[#18202f] border border-[#334155] text-white text-xs rounded-lg px-2.5 py-1.5 font-mono outline-none focus:border-[#6cd8cb]"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Day View: Category Filter */}
          {isDayView && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="category-select" className="text-xs font-mono text-[#879390]">
                Category:
              </label>
              <select
                id="category-select"
                name="category"
                defaultValue={selectedCategoryId ?? ""}
                onChange={(e) => e.target.form?.submit()}
                className="bg-[#18202f] border border-[#334155] text-white text-xs rounded-lg px-2.5 py-1.5 font-mono outline-none focus:border-[#6cd8cb]"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Week View: Resource Select */}
          {!isDayView && (
            <div className="flex items-center gap-1.5">
              <label htmlFor="resource-select" className="text-xs font-mono text-[#879390]">
                Resource:
              </label>
              <select
                id="resource-select"
                name="resource"
                defaultValue={selectedResourceId ?? ""}
                onChange={(e) => e.target.form?.submit()}
                className="bg-[#18202f] border border-[#334155] text-white text-xs rounded-lg px-2.5 py-1.5 font-mono outline-none focus:border-[#6cd8cb] max-w-[200px] truncate"
              >
                {siteResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Updated At indicator */}
          <span className="font-mono text-xs text-[#879390] tabular-nums shrink-0 pl-1">
            Updated at {updatedAt}
          </span>
        </div>
      </form>

      {/* Mobile Hint */}
      <div className="md:hidden text-xs text-[#879390] font-mono px-1 flex items-center gap-1.5">
        <span>Swipe sideways to see more resources / days.</span>
      </div>

      {/* 3. CALENDAR BENCH SHEET (CSS Grid) */}
      {isDayView ? (
        /* DAY VIEW GRID */
        dayData?.resources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#334155] p-12 text-center bg-[#141c2b] text-[#94a3b8]">
            <Layers className="size-8 mx-auto mb-2 text-slate-500" />
            <p className="font-semibold text-white">No resources found</p>
            <p className="text-xs text-slate-400 mt-1">
              There are no active or out-of-service resources matching this filter.
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative max-h-[calc(100dvh-13rem)] overflow-auto rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs"
            tabIndex={0}
            role="region"
            aria-label="Day calendar schedule grid"
          >
            <div
              className="grid min-w-[700px]"
              style={{
                gridTemplateColumns: `64px repeat(${dayData?.resources.length ?? 0}, minmax(160px, 1fr))`,
                gridTemplateRows: `64px repeat(${totalGridRows}, 26px)`,
              }}
            >
              {/* TOP-LEFT STICKY CORNER */}
              <div
                style={{ gridRow: 1, gridColumn: 1 }}
                className="sticky top-0 left-0 z-40 bg-[#18202f] border-b border-r border-[#334155] flex items-center justify-center font-mono text-[11px] font-bold text-[#879390]"
              >
                TIME
              </div>

              {/* STICKY COLUMN HEADERS (One per resource) */}
              {dayData?.resources.map((resource, colIdx) => {
                const isOos = resource.status === "OUT_OF_SERVICE";
                return (
                  <div
                    key={resource.id}
                    style={{ gridRow: 1, gridColumn: colIdx + 2 }}
                    className={`sticky top-0 z-30 bg-[#18202f] border-b border-r border-[#334155] p-2.5 flex flex-col justify-center min-w-[160px] ${
                      isOos ? "bg-rose-950/20" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        href={`/resources/${resource.id}`}
                        className="font-bold text-[14px] text-white hover:text-[#6cd8cb] truncate transition-colors"
                        title={resource.name}
                      >
                        {resource.name}
                      </Link>
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          isOos
                            ? "bg-rose-500 ring-2 ring-rose-500/30"
                            : "bg-[#6cd8cb] ring-2 ring-[#6cd8cb]/20"
                        }`}
                      />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
                      {isOos ? (
                        <ResourceStatusTag
                          status="OUT_OF_SERVICE"
                          className="text-[9px] px-1 py-0"
                        />
                      ) : (
                        <span className="text-[11px] font-mono text-[#879390] truncate">
                          {resource.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* STICKY TIME COLUMN (48 rows) */}
              {Array.from({ length: totalGridRows }).map((_, rIdx) => {
                const isFullHour = rIdx % 2 === 0;
                const label = rowLabel(rIdx, CALENDAR_ROW_MINUTES);

                return (
                  <div
                    key={`time-${rIdx}`}
                    style={{ gridRow: rIdx + 2, gridColumn: 1 }}
                    className={`sticky left-0 z-20 bg-[#141c2b] border-r border-[#334155] flex items-start justify-end pr-2 text-[11px] font-mono tabular-nums text-[#879390] select-none ${
                      isFullHour ? "border-t border-[#334155]" : "border-t border-[#334155]/30"
                    }`}
                  >
                    {label && <span className="-mt-2.5">{label}</span>}
                  </div>
                );
              })}

              {/* BACKGROUND CELLS & FREE SLOTS PER RESOURCE */}
              {dayData?.resources.map((resource, colIdx) => {
                const isOos = resource.status === "OUT_OF_SERVICE";

                // If OUT_OF_SERVICE, whole column is hatched
                if (isOos) {
                  return (
                    <div
                      key={`oos-${resource.id}`}
                      style={{
                        gridRow: `2 / span ${totalGridRows}`,
                        gridColumn: colIdx + 2,
                      }}
                      className="hatch-oos border-r border-[#334155] flex flex-col items-center justify-center p-4 text-center select-none"
                    >
                      <span className="font-mono text-xs font-bold text-rose-300 bg-[#060e1d]/90 px-3 py-1 rounded border border-rose-500/40">
                        Out of service
                      </span>
                    </div>
                  );
                }

                // Active resource: 48 30-minute slot cells
                return (
                  <React.Fragment key={`slots-${resource.id}`}>
                    {Array.from({ length: totalGridRows }).map((_, rIdx) => {
                      const isFullHour = rIdx % 2 === 0;
                      const hour = Math.floor((rIdx * CALENDAR_ROW_MINUTES) / 60);
                      const isStandardDay = STANDARD_WEEKDAYS.includes(dayData.weekday);
                      const isOffHours =
                        !isStandardDay ||
                        hour < STANDARD_DAY_START_HOUR ||
                        hour >= STANDARD_DAY_END_HOUR;

                      const timeStr = getTimeString(rIdx);

                      // Check if slot has passed
                      const slotDate = new Date(dayData.dayStart);
                      slotDate.setMinutes(rIdx * CALENDAR_ROW_MINUTES);
                      const hasPassed = slotDate.getTime() < nowMs;

                      return (
                        <div
                          key={`cell-${resource.id}-${rIdx}`}
                          style={{ gridRow: rIdx + 2, gridColumn: colIdx + 2 }}
                          className={`border-r border-[#334155] transition-colors relative ${
                            isFullHour
                              ? "border-t border-[#334155]"
                              : "border-t border-[#334155]/30"
                          } ${isOffHours ? "bg-[#060e1d]" : "bg-transparent"}`}
                        >
                          {canBookHere && !hasPassed ? (
                            <Link
                              href={`/bookings/new?resourceId=${resource.id}&date=${dayData.dateString}&start=${timeStr}`}
                              aria-label={`Book ${resource.name} at ${timeStr}`}
                              className="group/slot block w-full h-[26px] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#6cd8cb] focus-visible:z-20 hover:bg-[#18202f]/80 transition-colors"
                            >
                              <span className="hidden group-hover/slot:inline-block group-focus-visible/slot:inline-block text-[10px] font-mono text-[#6cd8cb] font-bold pl-1.5 leading-[26px]">
                                + {timeStr}
                              </span>
                            </Link>
                          ) : (
                            <div className="w-full h-[26px]" />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* RESERVATION BLOCKS OVERLAY */}
              {dayData?.resources.map((resource, colIdx) => {
                if (resource.status === "OUT_OF_SERVICE") return null;

                const colReservations = dayData.reservations.filter(
                  (r) => r.resourceId === resource.id,
                );

                return (
                  <React.Fragment key={`blocks-${resource.id}`}>
                    {colReservations.map((res) => {
                      const placement = placeOnDay({
                        startAt: new Date(res.startAt),
                        endAt: new Date(res.endAt),
                        dayStart: new Date(dayData.dayStart),
                        dayEnd: new Date(dayData.dayEnd),
                        rowMinutes: CALENDAR_ROW_MINUTES,
                      });

                      if (!placement) return null;

                      const isMaint = res.kind === "MAINTENANCE";
                      const isLong = res.durationMinutes > 60;

                      return (
                        <Link
                          key={res.id}
                          href={`/reservations/${res.id}`}
                          aria-label={`${
                            isMaint
                              ? "Maintenance"
                              : res.isMine
                                ? "Your booking"
                                : "Booking"
                          }: ${res.purpose}, ${res.timeRange} by ${res.createdBy.name}`}
                          title={`${res.purpose} (${res.timeRange})`}
                          style={{
                            gridRow: `${placement.startRow + 2} / span ${placement.rowSpan}`,
                            gridColumn: colIdx + 2,
                          }}
                          className={`m-0.5 rounded-[6px] p-2 flex flex-col justify-between overflow-hidden shadow-2xs z-10 transition-all hover:scale-[1.005] hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6cd8cb] ${
                            isMaint
                              ? "hatch-maint text-[#ffb77d] border-l-[3px] border-l-[#d97707] border border-[#d97707]/40"
                              : res.isMine
                                ? "bg-[#222a3a] text-[#6cd8cb] border-l-[3px] border-l-[#6cd8cb] border border-[#6cd8cb]/40"
                                : "bg-[#18202f] text-[#7bd0ff] border-l-[3px] border-l-[#6cd8cb] border border-[#334155]"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[13px] font-bold truncate ${
                                  isLong ? "line-clamp-2" : ""
                                } ${isMaint ? "text-[#ffb77d]" : "text-white"}`}
                              >
                                {res.purpose}
                              </span>
                              {res.isMine && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-[#003732] uppercase font-mono shrink-0">
                                  You
                                </span>
                              )}
                              {isMaint && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#d97707]/30 text-[#ffb77d] uppercase font-mono shrink-0">
                                  Maint
                                </span>
                              )}
                            </div>
                            {!isMaint && (
                              <p className="text-[11px] text-[#94a3b8] truncate font-medium">
                                {res.createdBy.name}
                              </p>
                            )}
                          </div>
                          <p className="font-mono text-[11px] font-semibold tabular-nums text-white/90 mt-1">
                            {res.timeRange}
                          </p>
                        </Link>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )
      ) : (
        /* WEEK VIEW GRID */
        !weekData?.resource ? (
          <div className="rounded-xl border border-dashed border-[#334155] p-12 text-center bg-[#141c2b] text-[#94a3b8]">
            <Layers className="size-8 mx-auto mb-2 text-slate-500" />
            <p className="font-semibold text-white">No active resource selected</p>
            <p className="text-xs text-slate-400 mt-1">
              Select an active instrument or room to view its 7-day schedule.
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative max-h-[calc(100dvh-13rem)] overflow-auto rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs"
            tabIndex={0}
            role="region"
            aria-label="Week calendar schedule grid"
          >
            <div
              className="grid min-w-[700px]"
              style={{
                gridTemplateColumns: `64px repeat(7, minmax(140px, 1fr))`,
                gridTemplateRows: `64px repeat(${totalGridRows}, 26px)`,
              }}
            >
              {/* TOP-LEFT STICKY CORNER */}
              <div
                style={{ gridRow: 1, gridColumn: 1 }}
                className="sticky top-0 left-0 z-40 bg-[#18202f] border-b border-r border-[#334155] flex items-center justify-center font-mono text-[11px] font-bold text-[#879390]"
              >
                TIME
              </div>

              {/* STICKY COLUMN HEADERS (Monday to Sunday) */}
              {weekData.days.map((day, dayIdx) => (
                <div
                  key={day.dateString}
                  style={{ gridRow: 1, gridColumn: dayIdx + 2 }}
                  className={`sticky top-0 z-30 bg-[#18202f] border-b border-r border-[#334155] p-2.5 flex flex-col justify-center min-w-[140px] ${
                    day.isToday ? "bg-[#222a3a]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[14px] font-bold truncate ${
                        day.isToday ? "text-[#6cd8cb]" : "text-white"
                      }`}
                    >
                      {day.dayFormatted}
                    </span>
                    {day.isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#6cd8cb]/20 text-[#6cd8cb] border border-[#6cd8cb]/40">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#879390]">
                    {weekData.resource?.name}
                  </span>
                </div>
              ))}

              {/* STICKY TIME COLUMN (48 rows) */}
              {Array.from({ length: totalGridRows }).map((_, rIdx) => {
                const isFullHour = rIdx % 2 === 0;
                const label = rowLabel(rIdx, CALENDAR_ROW_MINUTES);

                return (
                  <div
                    key={`time-week-${rIdx}`}
                    style={{ gridRow: rIdx + 2, gridColumn: 1 }}
                    className={`sticky left-0 z-20 bg-[#141c2b] border-r border-[#334155] flex items-start justify-end pr-2 text-[11px] font-mono tabular-nums text-[#879390] select-none ${
                      isFullHour ? "border-t border-[#334155]" : "border-t border-[#334155]/30"
                    }`}
                  >
                    {label && <span className="-mt-2.5">{label}</span>}
                  </div>
                );
              })}

              {/* BACKGROUND CELLS & FREE SLOTS PER DAY */}
              {weekData.days.map((day, dayIdx) => {
                const res = weekData.resource;
                const isOos = res?.status === "OUT_OF_SERVICE";

                if (isOos) {
                  return (
                    <div
                      key={`week-oos-${day.dateString}`}
                      style={{
                        gridRow: `2 / span ${totalGridRows}`,
                        gridColumn: dayIdx + 2,
                      }}
                      className="hatch-oos border-r border-[#334155] flex flex-col items-center justify-center p-4 text-center select-none"
                    >
                      <span className="font-mono text-xs font-bold text-rose-300 bg-[#060e1d]/90 px-3 py-1 rounded border border-rose-500/40">
                        Out of service
                      </span>
                    </div>
                  );
                }

                return (
                  <React.Fragment key={`week-slots-${day.dateString}`}>
                    {Array.from({ length: totalGridRows }).map((_, rIdx) => {
                      const isFullHour = rIdx % 2 === 0;
                      const hour = Math.floor((rIdx * CALENDAR_ROW_MINUTES) / 60);
                      const isStandardDay = STANDARD_WEEKDAYS.includes(day.weekday);
                      const isOffHours =
                        !isStandardDay ||
                        hour < STANDARD_DAY_START_HOUR ||
                        hour >= STANDARD_DAY_END_HOUR;

                      const timeStr = getTimeString(rIdx);

                      const slotDate = new Date(day.dayStart);
                      slotDate.setMinutes(rIdx * CALENDAR_ROW_MINUTES);
                      const hasPassed = slotDate.getTime() < nowMs;

                      return (
                        <div
                          key={`week-cell-${day.dateString}-${rIdx}`}
                          style={{ gridRow: rIdx + 2, gridColumn: dayIdx + 2 }}
                          className={`border-r border-[#334155] transition-colors relative ${
                            isFullHour
                              ? "border-t border-[#334155]"
                              : "border-t border-[#334155]/30"
                          } ${isOffHours ? "bg-[#060e1d]" : "bg-transparent"}`}
                        >
                          {canBookHere && !hasPassed && res ? (
                            <Link
                              href={`/bookings/new?resourceId=${res.id}&date=${day.dateString}&start=${timeStr}`}
                              aria-label={`Book ${res.name} at ${timeStr}`}
                              className="group/slot block w-full h-[26px] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#6cd8cb] focus-visible:z-20 hover:bg-[#18202f]/80 transition-colors"
                            >
                              <span className="hidden group-hover/slot:inline-block group-focus-visible/slot:inline-block text-[10px] font-mono text-[#6cd8cb] font-bold pl-1.5 leading-[26px]">
                                + {timeStr}
                              </span>
                            </Link>
                          ) : (
                            <div className="w-full h-[26px]" />
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* RESERVATIONS OVERLAY FOR WEEK */}
              {weekData.resource &&
                weekData.resource.status !== "OUT_OF_SERVICE" &&
                weekData.days.map((day, dayIdx) => (
                  <React.Fragment key={`week-blocks-${day.dateString}`}>
                    {weekData.reservations.map((res) => {
                      const placement = placeOnDay({
                        startAt: new Date(res.startAt),
                        endAt: new Date(res.endAt),
                        dayStart: new Date(day.dayStart),
                        dayEnd: new Date(day.dayEnd),
                        rowMinutes: CALENDAR_ROW_MINUTES,
                      });

                      if (!placement) return null;

                      const isMaint = res.kind === "MAINTENANCE";
                      const isLong = res.durationMinutes > 60;

                      return (
                        <Link
                          key={`res-${res.id}-${day.dateString}`}
                          href={`/reservations/${res.id}`}
                          aria-label={`${
                            isMaint
                              ? "Maintenance"
                              : res.isMine
                                ? "Your booking"
                                : "Booking"
                          }: ${res.purpose}, ${res.timeRange} by ${res.createdBy.name}`}
                          title={`${res.purpose} (${res.timeRange})`}
                          style={{
                            gridRow: `${placement.startRow + 2} / span ${placement.rowSpan}`,
                            gridColumn: dayIdx + 2,
                          }}
                          className={`m-0.5 rounded-[6px] p-2 flex flex-col justify-between overflow-hidden shadow-2xs z-10 transition-all hover:scale-[1.005] hover:z-20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6cd8cb] ${
                            isMaint
                              ? "hatch-maint text-[#ffb77d] border-l-[3px] border-l-[#d97707] border border-[#d97707]/40"
                              : res.isMine
                                ? "bg-[#222a3a] text-[#6cd8cb] border-l-[3px] border-l-[#6cd8cb] border border-[#6cd8cb]/40"
                                : "bg-[#18202f] text-[#7bd0ff] border-l-[3px] border-l-[#6cd8cb] border border-[#334155]"
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-[13px] font-bold truncate ${
                                  isLong ? "line-clamp-2" : ""
                                } ${isMaint ? "text-[#ffb77d]" : "text-white"}`}
                              >
                                {res.purpose}
                              </span>
                              {res.isMine && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white text-[#003732] uppercase font-mono shrink-0">
                                  You
                                </span>
                              )}
                              {isMaint && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#d97707]/30 text-[#ffb77d] uppercase font-mono shrink-0">
                                  Maint
                                </span>
                              )}
                            </div>
                            {!isMaint && (
                              <p className="text-[11px] text-[#94a3b8] truncate font-medium">
                                {res.createdBy.name}
                              </p>
                            )}
                          </div>
                          <p className="font-mono text-[11px] font-semibold tabular-nums text-white/90 mt-1">
                            {res.timeRange}
                          </p>
                        </Link>
                      );
                    })}
                  </React.Fragment>
                ))}
            </div>
          </div>
        )
      )}

      {/* 4. LEGEND */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#879390] pt-1 px-1">
        <span className="font-bold text-white">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#18202f] border-l-[3px] border-l-[#6cd8cb] border border-[#334155]" />
          <span>Booking</span>
        </div>
        {canBookHere && (
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded bg-[#222a3a] border-l-[3px] border-l-[#6cd8cb] border border-[#6cd8cb]/40 flex items-center justify-center">
              <span className="text-[8px] font-bold text-[#6cd8cb]">Y</span>
            </span>
            <span>Your booking</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded hatch-maint border-l-[3px] border-l-[#d97707] border border-[#d97707]/40" />
          <span>Maintenance</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded hatch-oos border border-rose-500/40" />
          <span>Out of service</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-[#060e1d] border border-[#334155]" />
          <span>Outside standard hours</span>
        </div>
      </div>
    </div>
  );
}
