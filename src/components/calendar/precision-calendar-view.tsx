"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarPlus,
  ArrowUpRight,
  CalendarX,
  Layers,
} from "lucide-react";
import { PeekSheet } from "@/components/ui/peek-sheet";
import { StatusPill } from "@/components/resource-status-tag";
import { cn } from "@/lib/utils";
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
  canBlockHere?: boolean;
  updatedAt: string;
  zoneCity: string;
  nowMs: number;
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
      dayFormatted: string;
      weekday: number;
      isToday: boolean;
    }>;
    reservations: CalendarReservation[];
  } | null;
}

// 12-hour display window from 07:00 to 19:00
const GRID_START_HOUR = 7;
const GRID_END_HOUR = 19;
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR; // 12
const HOURS_ARRAY = Array.from({ length: TOTAL_HOURS }, (_, i) => GRID_START_HOUR + i);

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
  nowMs,
  dayData,
  weekData,
}: PrecisionCalendarViewProps) {
  const router = useRouter();

  // Mobile view mode: "agenda" (default on small phones) vs "grid"
  const [mobileMode, setMobileMode] = React.useState<"agenda" | "grid">("agenda");

  const handleModeChange = (mode: "agenda" | "grid") => {
    setMobileMode(mode);
  };

  // Peek sheet state for inspecting a booking or block
  const [selectedRes, setSelectedRes] = React.useState<CalendarReservation | null>(null);

  const isDayView = view === "day";

  // Calculate now position (in minutes since 07:00)
  const nowDate = new Date(nowMs);
  const nowHours = nowDate.getHours();
  const nowMinutes = nowDate.getMinutes();
  const nowTotalMinutes = nowHours * 60 + nowMinutes;
  const gridStartMinutes = GRID_START_HOUR * 60;
  const gridTotalMinutes = TOTAL_HOURS * 60;
  const isNowInGrid = nowTotalMinutes >= gridStartMinutes && nowTotalMinutes <= GRID_END_HOUR * 60;
  const nowPercentage = Math.max(
    0,
    Math.min(100, ((nowTotalMinutes - gridStartMinutes) / gridTotalMinutes) * 100),
  );
  const nowTimeString = `${String(nowHours).padStart(2, "0")}:${String(nowMinutes).padStart(2, "0")}`;

  // Helper to place reservations horizontally
  const getHorizontalPlacement = (startAt: Date | string, endAt: Date | string) => {
    const s = new Date(startAt);
    const e = new Date(endAt);
    const startM = s.getHours() * 60 + s.getMinutes();
    const endM = e.getHours() * 60 + e.getMinutes();

    const clampedStart = Math.max(gridStartMinutes, startM);
    const clampedEnd = Math.min(GRID_END_HOUR * 60, endM);

    const left = Math.max(0, ((clampedStart - gridStartMinutes) / gridTotalMinutes) * 100);
    const width = Math.max(1.5, ((clampedEnd - clampedStart) / gridTotalMinutes) * 100);

    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP TOOLBAR: View toggle, date nav, site, categories, updated */}
      <div className="rounded-[20px] bg-card border border-card-edge p-3 sm:p-4 shadow-v4 flex flex-wrap items-center justify-between gap-3">
        {/* Left: View toggle + Stepper */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Day / Week segmented toggle */}
          <div className="inline-flex rounded-full bg-canvas p-1 border border-line">
            <Link
              href={`/calendar?view=day&date=${date}&site=${selectedSiteId}${
                selectedCategoryId ? `&category=${selectedCategoryId}` : ""
              }`}
              className={cn(
                "px-3.5 py-1 text-xs font-bold rounded-full transition-all",
                view === "day" ? "bg-teal text-white shadow-xs" : "text-muted hover:text-navy",
              )}
            >
              Day
            </Link>
            <Link
              href={`/calendar?view=week&date=${date}&site=${selectedSiteId}${
                selectedResourceId ? `&resource=${selectedResourceId}` : ""
              }`}
              className={cn(
                "px-3.5 py-1 text-xs font-bold rounded-full transition-all",
                view === "week" ? "bg-teal text-white shadow-xs" : "text-muted hover:text-navy",
              )}
            >
              Week
            </Link>
          </div>

          {/* Stepper buttons */}
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?view=${view}&date=${prevDate}&site=${selectedSiteId}${
                isDayView
                  ? selectedCategoryId
                    ? `&category=${selectedCategoryId}`
                    : ""
                  : selectedResourceId
                    ? `&resource=${selectedResourceId}`
                    : ""
              }`}
              aria-label="Previous"
              className="flex size-8 items-center justify-center rounded-lg border border-card-edge bg-card hover:bg-canvas text-navy transition-colors"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`/calendar?view=${view}&date=${todayDate}&site=${selectedSiteId}${
                isDayView
                  ? selectedCategoryId
                    ? `&category=${selectedCategoryId}`
                    : ""
                  : selectedResourceId
                    ? `&resource=${selectedResourceId}`
                    : ""
              }`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-card-edge bg-card hover:bg-canvas text-navy transition-colors"
            >
              <CalendarDays className="size-3.5 text-teal" />
              <span>Today</span>
            </Link>
            <Link
              href={`/calendar?view=${view}&date=${nextDate}&site=${selectedSiteId}${
                isDayView
                  ? selectedCategoryId
                    ? `&category=${selectedCategoryId}`
                    : ""
                  : selectedResourceId
                    ? `&resource=${selectedResourceId}`
                    : ""
              }`}
              aria-label="Next"
              className="flex size-8 items-center justify-center rounded-lg border border-card-edge bg-card hover:bg-canvas text-navy transition-colors"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>

          <span className="text-xs sm:text-sm font-extrabold text-navy pl-1">{formattedDate}</span>
        </div>

        {/* Right: Site select, mobile Agenda/Grid toggle, Updated indicator */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Site select if multiple */}
          {sites.length > 1 && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="cal-site-select"
                className="text-xs font-bold text-muted uppercase tracking-wider"
              >
                Site:
              </label>
              <select
                id="cal-site-select"
                defaultValue={selectedSiteId}
                onChange={(e) => {
                  router.push(
                    `/calendar?view=${view}&date=${date}&site=${e.target.value}${
                      selectedCategoryId ? `&category=${selectedCategoryId}` : ""
                    }`,
                  );
                }}
                className="h-8 rounded-lg border border-card-edge bg-card px-2.5 text-xs font-semibold text-navy outline-none focus:border-teal"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Week view resource select */}
          {!isDayView && (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="cal-res-select"
                className="text-xs font-bold text-muted uppercase tracking-wider"
              >
                Resource:
              </label>
              <select
                id="cal-res-select"
                defaultValue={selectedResourceId ?? ""}
                onChange={(e) => {
                  router.push(
                    `/calendar?view=week&date=${date}&site=${selectedSiteId}&resource=${e.target.value}`,
                  );
                }}
                className="h-8 rounded-lg border border-card-edge bg-card px-2.5 text-xs font-semibold text-navy outline-none focus:border-teal max-w-[180px] truncate"
              >
                {siteResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mobile Agenda / Grid segmented switch (< 768px) */}
          {isDayView && (
            <div className="flex md:hidden rounded-lg bg-canvas p-0.5 border border-line">
              <button
                type="button"
                onClick={() => handleModeChange("agenda")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                  mobileMode === "agenda"
                    ? "bg-card text-navy shadow-xs"
                    : "text-muted hover:text-navy",
                )}
              >
                Agenda
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("grid")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-md transition-all",
                  mobileMode === "grid"
                    ? "bg-card text-navy shadow-xs"
                    : "text-muted hover:text-navy",
                )}
              >
                Grid
              </button>
            </div>
          )}

          {/* Updated indicator */}
          <div className="flex items-center gap-1.5 text-xs text-muted font-medium pl-1">
            <span className="size-2 rounded-full bg-green" />
            <span className="hidden sm:inline">Updated at</span>
            <span className="font-semibold tabular-nums">{updatedAt}</span>
          </div>
        </div>
      </div>

      {/* 2. CATEGORY FILTER CHIPS (Day view) */}
      {isDayView && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Link
            href={`/calendar?view=day&date=${date}&site=${selectedSiteId}`}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border",
              !selectedCategoryId
                ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
                : "bg-card border-card-edge text-muted hover:text-navy",
            )}
          >
            All
          </Link>
          {categories.map((c) => {
            const isActive = selectedCategoryId === c.id;
            return (
              <Link
                key={c.id}
                href={`/calendar?view=day&date=${date}&site=${selectedSiteId}&category=${c.id}`}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border",
                  isActive
                    ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
                    : "bg-card border-card-edge text-muted hover:text-navy",
                )}
              >
                {c.name}
              </Link>
            );
          })}
        </div>
      )}

      {/* 3. CALENDAR CONTENT: Desktop Lanes or Mobile Agenda/Grid */}
      {isDayView ? (
        dayData?.resources.length === 0 ? (
          <div className="rounded-[20px] bg-card border border-dashed border-card-edge p-12 text-center shadow-v4">
            <Layers className="size-8 mx-auto mb-2 text-muted" />
            <h3 className="font-bold text-navy">No resources found</h3>
            <p className="text-xs text-muted mt-1">
              There are no resources matching this category in {dayData?.site?.name ?? "this site"}.
            </p>
          </div>
        ) : (
          <>
            {/* 3A. MOBILE AGENDA VIEW (< 768px and mobileMode === "agenda") */}
            <div className={cn("space-y-3", mobileMode === "grid" ? "hidden" : "md:hidden")}>
              {dayData?.resources.map((resource) => {
                const isOos = resource.status === "OUT_OF_SERVICE";
                const resBookings = dayData.reservations.filter(
                  (r) => r.resourceId === resource.id,
                );

                return (
                  <div
                    key={resource.id}
                    className="rounded-[16px] bg-card border border-card-edge p-4 shadow-v4 space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-sm text-navy">{resource.name}</h3>
                        <p className="text-xs text-muted">
                          {resource.section.name} · {resource.category.name}
                        </p>
                      </div>
                      <StatusPill status={resource.status} />
                    </div>

                    {/* Bookings / Free / OOS list */}
                    {isOos ? (
                      <div className="rounded-xl bg-red-soft p-3 text-xs text-red font-medium">
                        Laser fault, engineer scheduled · Out of service
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {resBookings.length === 0 ? (
                          <Link
                            href={`/book?resourceId=${resource.id}&date=${date}`}
                            className="flex items-center justify-between p-3 rounded-xl border border-dashed border-teal-line bg-mint text-teal hover:bg-teal-soft transition-colors"
                          >
                            <div>
                              <div className="text-xs font-bold">Free all day</div>
                              <div className="text-[11px] text-teal/80">Tap to book a slot</div>
                            </div>
                            <CalendarPlus className="size-4" />
                          </Link>
                        ) : (
                          resBookings.map((res) => {
                            const isMine = res.isMine;
                            const isMaint = res.kind === "MAINTENANCE";

                            return (
                              <button
                                key={res.id}
                                type="button"
                                onClick={() => setSelectedRes(res)}
                                className={cn(
                                  "w-full text-left p-3 rounded-xl transition-transform active:scale-[0.99] flex items-center justify-between relative overflow-hidden",
                                  isMine
                                    ? "bg-gradient-to-br from-teal to-teal-deep text-white shadow-xs"
                                    : isMaint
                                      ? "bg-amber-soft border border-amber-line text-amber"
                                      : "bg-teal-soft border border-teal-line text-teal-deep",
                                )}
                              >
                                {!isMine && (
                                  <div
                                    className={cn(
                                      "absolute left-0 top-0 bottom-0 w-1",
                                      isMaint ? "bg-amber-strong" : "bg-teal",
                                    )}
                                  />
                                )}
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs truncate">
                                      {res.purpose}
                                    </span>
                                    {isMine && (
                                      <span className="px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase bg-white text-teal rounded">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-[11px] truncate",
                                      isMine ? "text-white/80" : "text-muted",
                                    )}
                                  >
                                    {isMine ? "Your booking" : res.createdBy.name}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "font-bold text-xs tabular-nums shrink-0",
                                    isMine
                                      ? "text-white"
                                      : isMaint
                                        ? "text-amber"
                                        : "text-teal-deep",
                                  )}
                                >
                                  {res.timeRange}
                                </div>
                              </button>
                            );
                          })
                        )}

                        {/* Quick tap-to-book free gap banner if not full */}
                        {canBookHere && (
                          <Link
                            href={`/book?resourceId=${resource.id}&date=${date}`}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-dashed border-teal-line/80 bg-canvas text-teal text-xs font-bold hover:bg-mint transition-colors"
                          >
                            <span>Book another slot</span>
                            <CalendarPlus className="size-3.5" />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 3B. HORIZONTAL LANES GRID (Desktop always, or Mobile when mobileMode === "grid") */}
            <div
              className={cn(
                "rounded-[20px] bg-card border border-card-edge shadow-v4 overflow-hidden",
                mobileMode === "agenda" ? "hidden md:block" : "block",
              )}
            >
              <div className="overflow-x-auto relative scrollbar-thin">
                <div
                  className="relative min-w-[960px] select-none"
                  style={{ minWidth: "calc(200px + 12 * 76px)" }}
                >
                  {/* Grid Header: Resource corner + Hour columns */}
                  <div className="grid grid-cols-[200px_1fr] bg-canvas border-b border-line">
                    <div className="p-3 text-[11px] font-extrabold uppercase tracking-wider text-muted border-r border-line sticky left-0 bg-canvas z-20">
                      Resource
                    </div>
                    <div className="grid grid-cols-12 text-[11px] font-extrabold text-muted">
                      {HOURS_ARRAY.map((hr) => (
                        <div key={hr} className="p-3 border-r border-line/60 tabular-nums">
                          {String(hr).padStart(2, "0")}:00
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource rows */}
                  <div className="relative">
                    {/* Red Now line if today */}
                    {dayData?.isToday && isNowInGrid && (
                      <div
                        className="absolute top-0 bottom-0 z-30 pointer-events-none"
                        style={{
                          left: `calc(200px + (100% - 200px) * ${nowPercentage / 100})`,
                        }}
                      >
                        <div className="w-0.5 h-full bg-red relative">
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-red px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow-xs">
                            {nowTimeString}
                          </span>
                        </div>
                      </div>
                    )}

                    {dayData?.resources.map((resource) => {
                      const isOos = resource.status === "OUT_OF_SERVICE";
                      const resBookings = dayData.reservations.filter(
                        (r) => r.resourceId === resource.id,
                      );

                      return (
                        <div
                          key={resource.id}
                          className="grid grid-cols-[200px_1fr] border-b border-line min-h-[58px]"
                        >
                          {/* Sticky Resource cell */}
                          <div className="p-3 bg-card border-r border-line sticky left-0 z-10 flex flex-col justify-center">
                            <span className="font-extrabold text-xs text-navy truncate">
                              {resource.name}
                            </span>
                            <span className="text-[11px] text-muted truncate">
                              {resource.section.name}
                            </span>
                          </div>

                          {/* Time track */}
                          <div
                            className={cn(
                              "relative h-full grid grid-cols-12",
                              isOos
                                ? "bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(180,35,24,0.06)_10px,rgba(180,35,24,0.06)_12px)]"
                                : "bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:calc((100%)/12)_100%]",
                            )}
                          >
                            {/* Empty hour cells for clicking free slots */}
                            {HOURS_ARRAY.map((hr, idx) => (
                              <Link
                                key={idx}
                                href={`/book?resourceId=${resource.id}&date=${date}&start=${String(hr).padStart(2, "0")}:00`}
                                aria-label={`Book ${resource.name} at ${hr}:00`}
                                className={cn(
                                  "h-full transition-colors border-r border-line/40 flex items-center justify-center opacity-0 hover:opacity-100",
                                  isOos ? "pointer-events-none" : "hover:bg-mint/80",
                                )}
                              >
                                <span className="text-[10px] font-bold text-teal">+ {hr}:00</span>
                              </Link>
                            ))}

                            {/* Out of service label */}
                            {isOos && (
                              <div className="absolute inset-y-2 left-4 flex items-center pointer-events-none z-10">
                                <span className="rounded-md bg-red-soft px-2.5 py-1 text-xs font-bold text-red border border-red/20">
                                  Out of service
                                </span>
                              </div>
                            )}

                            {/* Render bookings positioned horizontally */}
                            {!isOos &&
                              resBookings.map((res) => {
                                const pos = getHorizontalPlacement(res.startAt, res.endAt);
                                const isMine = res.isMine;
                                const isMaint = res.kind === "MAINTENANCE";

                                return (
                                  <button
                                    key={res.id}
                                    type="button"
                                    onClick={() => setSelectedRes(res)}
                                    style={{ left: pos.left, width: pos.width }}
                                    className={cn(
                                      "absolute top-1.5 bottom-1.5 rounded-lg px-2 text-left z-10 transition-transform active:scale-[0.98] overflow-hidden flex flex-col justify-center",
                                      isMine
                                        ? "bg-gradient-to-br from-teal to-teal-deep text-white shadow-xs"
                                        : isMaint
                                          ? "bg-amber-soft border border-amber-line text-amber shadow-xs"
                                          : "bg-teal-soft border border-teal-line text-teal-deep shadow-xs",
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5 leading-tight truncate">
                                      <b className="text-[11px] font-bold truncate">
                                        {res.purpose}
                                      </b>
                                      {isMine && (
                                        <span className="shrink-0 px-1 py-0.2 text-[9px] font-extrabold uppercase bg-white text-teal rounded">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className={cn(
                                        "text-[10px] tabular-nums truncate",
                                        isMine ? "text-white/80" : "text-muted",
                                      )}
                                    >
                                      {res.timeRange}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Legend */}
              <div className="px-5 py-3 border-t border-line bg-canvas/40 flex flex-wrap items-center justify-between text-xs text-muted gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-teal" />
                    <span className="font-medium">Reserved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-teal-deep" />
                    <span className="font-medium">You</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-strong" />
                    <span className="font-medium">Maintenance</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red" />
                    <span className="font-medium">Out of service</span>
                  </div>
                </div>
                <div className="text-[11px] text-faint">
                  Click any slot to book. Resource names stay fixed while scrolling horizontally.
                </div>
              </div>
            </div>
          </>
        )
      ) : (
        /* WEEK VIEW */
        <div className="rounded-[20px] bg-card border border-card-edge shadow-v4 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-navy text-base">
                {weekData?.resource?.name ?? "Resource Schedule"}
              </h3>
              <p className="text-xs text-muted">
                {weekData?.resource?.section.name} · {weekData?.resource?.category.name}
              </p>
            </div>
            {weekData?.resource && <StatusPill status={weekData.resource.status} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {weekData?.days.map((day) => {
              const dayBookings = weekData.reservations.filter((r) => {
                const rDate = new Date(r.startAt).toISOString().split("T")[0];
                return rDate === day.dateString;
              });

              return (
                <div
                  key={day.dateString}
                  className={cn(
                    "rounded-xl border p-3 flex flex-col space-y-2",
                    day.isToday ? "border-teal bg-mint/40" : "border-line bg-canvas/30",
                  )}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-line">
                    <span className="text-xs font-bold text-navy">{day.dayFormatted}</span>
                    {day.isToday && (
                      <span className="text-[9.5px] font-extrabold uppercase text-teal">Today</span>
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {dayBookings.length === 0 ? (
                      <div className="text-[11px] text-muted italic py-2">No bookings</div>
                    ) : (
                      dayBookings.map((res) => (
                        <button
                          key={res.id}
                          type="button"
                          onClick={() => setSelectedRes(res)}
                          className={cn(
                            "w-full text-left p-2 rounded-lg text-xs font-medium space-y-0.5",
                            res.isMine
                              ? "bg-gradient-to-br from-teal to-teal-deep text-white"
                              : "bg-teal-soft text-teal-deep border border-teal-line",
                          )}
                        >
                          <div className="font-bold truncate">{res.purpose}</div>
                          <div className="text-[10px] tabular-nums truncate opacity-90">
                            {res.timeRange}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. PEEK SHEET: Opens when tapping any booking / maintenance item */}
      {selectedRes && (
        <PeekSheet
          open={Boolean(selectedRes)}
          onOpenChange={(open) => !open && setSelectedRes(null)}
          eyebrow={selectedRes.kind === "MAINTENANCE" ? "MAINTENANCE" : "BOOKING"}
          title={selectedRes.purpose}
          actions={
            <div className="flex w-full items-center justify-between gap-3">
              <Link
                href={`/reservations/${selectedRes.id}`}
                className="inline-flex items-center justify-center gap-1.5 flex-1 h-11 px-4 rounded-xl border border-card-edge bg-card hover:bg-canvas font-bold text-xs text-navy transition-colors"
              >
                <ArrowUpRight className="size-4" />
                <span>Open full page</span>
              </Link>
              {(selectedRes.isMine || user.role === "ADMIN" || user.role === "MANAGER") && (
                <Link
                  href={`/reservations/${selectedRes.id}?action=cancel`}
                  className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl border border-red/30 bg-red-soft hover:bg-red/10 font-bold text-xs text-red transition-colors"
                >
                  <CalendarX className="size-4" />
                  <span>Cancel</span>
                </Link>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-canvas p-3 border border-line space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted font-medium">Time</span>
                <span className="font-bold text-navy tabular-nums">{selectedRes.timeRange}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted font-medium">Duration</span>
                <span className="font-bold text-navy tabular-nums">
                  {selectedRes.durationMinutes} minutes
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted font-medium">Booked by</span>
                <span className="font-bold text-navy">{selectedRes.createdBy.name}</span>
              </div>
            </div>
            {selectedRes.isMine && (
              <div className="p-3 rounded-xl bg-teal-soft border border-teal-line text-xs text-teal-deep font-medium">
                This is your reservation. You can modify or cancel it from the detail page.
              </div>
            )}
          </div>
        </PeekSheet>
      )}
    </div>
  );
}
