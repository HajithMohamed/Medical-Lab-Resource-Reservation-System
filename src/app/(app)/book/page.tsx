import * as React from "react";
import Link from "next/link";
import {
  CalendarSearch,
  Filter,
  Clock,
  MapPin,
  Users as UsersIcon,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canBook } from "@/lib/permissions";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { findSlots, type FindSlotsQueryInput } from "@/services/availability";
import { FIND_SLOT_DURATIONS_MINUTES, SLOT_MINUTES } from "@/config/rules";
import { formatMinutes } from "@/lib/format";
import { formatLabRange, labTimeString } from "@/lib/time";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Find a Slot | BenchBook",
  description: "Search live availability across laboratory resources and reserve without clashes.",
};

interface FindSlotPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function FindSlotPage({ searchParams }: FindSlotPageProps) {
  const user = await requireUser();
  if (!canBook(user)) {
    redirect("/bookings/manage");
  }
  const rawParams = searchParams ? await searchParams : {};

  // Extract clean string parameters
  const getParam = (key: string): string | undefined => {
    const val = rawParams[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const queryInput: FindSlotsQueryInput = {
    date: getParam("date"),
    start: getParam("start"),
    duration: getParam("duration"),
    categoryId: getParam("categoryId"),
    sectionId: getParam("sectionId"),
    siteId: getParam("siteId"),
    people: getParam("people"),
    q: getParam("q"),
    freeOnly: getParam("freeOnly"),
  };

  // Run availability search
  const result = await findSlots(user, queryInput);
  const zone = env.APP_TIME_ZONE;

  // Load dropdown master data in parallel
  const [sites, categories, sections] = await Promise.all([
    db.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { id: true, name: true, maxBookingMinutes: true, iconKey: true },
      orderBy: { name: "asc" },
    }),
    db.section.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Selected category helper for duration and people field hints
  const selectedCategory = categories.find((c) => c.id === result.query.categoryId);
  const showPeopleInput = !selectedCategory || selectedCategory.iconKey === "room";

  // Generate 15-minute slot options (00:00 to 23:45)
  const slotOptions: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      const hStr = String(hour).padStart(2, "0");
      const mStr = String(minute).padStart(2, "0");
      slotOptions.push(`${hStr}:${mStr}`);
    }
  }

  // Duration label formatter
  const formatDurationOption = (mins: number) => {
    if (mins < 60) return `${mins} minutes`;
    const hrs = mins / 60;
    return hrs === 1 ? "1 hour" : `${hrs} hours`;
  };

  // Result line formatting
  const currentSiteName =
    result.query.siteId === "any"
      ? "all sites"
      : (sites.find((s) => s.id === result.query.siteId)?.name ?? "selected site");

  const formattedRange = formatLabRange(result.requestedStartAt, result.requestedEndAt, zone);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[#18202f] border border-[#334155] flex items-center justify-center text-[#6cd8cb] shrink-0">
            <CalendarSearch className="size-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
              Find a slot
            </h1>
            <p className="text-xs text-slate-400">
              Instant availability across all lab resources with guaranteed clash-free booking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs h-8 border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-slate-300"
          >
            <Link href="/calendar">View calendar</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs h-8 border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-slate-300"
          >
            <Link href="/bookings">My bookings</Link>
          </Button>
        </div>
      </div>

      {/* Fallback Note if requested times were adjusted */}
      {result.note && (
        <div
          role="status"
          className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-amber-200 text-xs font-mono flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertTriangle className="size-4 text-amber-400 shrink-0" />
          <span>{result.note}</span>
        </div>
      )}

      {/* Search Filter Panel (Plain GET form; works without JS, shareable URLs) */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs">
        <form method="GET" action="/book" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Date */}
            <div className="space-y-1">
              <label
                htmlFor="dateInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Date <span className="text-[#6cd8cb]">*</span>
              </label>
              <input
                type="date"
                id="dateInput"
                name="date"
                required
                defaultValue={result.query.date}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              />
            </div>

            {/* 2. Start Time */}
            <div className="space-y-1">
              <label
                htmlFor="startInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Start time <span className="text-[#6cd8cb]">*</span>
              </label>
              <select
                id="startInput"
                name="start"
                required
                defaultValue={result.query.start}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              >
                {slotOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Duration */}
            <div className="space-y-1">
              <label
                htmlFor="durationInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Duration <span className="text-[#6cd8cb]">*</span>
              </label>
              <select
                id="durationInput"
                name="duration"
                required
                defaultValue={result.query.duration}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              >
                {FIND_SLOT_DURATIONS_MINUTES.map((dur) => {
                  const isOverLimit = selectedCategory && dur > selectedCategory.maxBookingMinutes;
                  return (
                    <option key={dur} value={dur} disabled={Boolean(isOverLimit)}>
                      {formatDurationOption(dur)}
                      {isOverLimit
                        ? ` (over the ${formatMinutes(selectedCategory.maxBookingMinutes)} limit)`
                        : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 4. Site */}
            <div className="space-y-1">
              <label
                htmlFor="siteInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Laboratory site
              </label>
              <select
                id="siteInput"
                name="siteId"
                defaultValue={result.query.siteId}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              >
                <option value="any">Any site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Category */}
            <div className="space-y-1">
              <label
                htmlFor="categoryInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Category
              </label>
              <select
                id="categoryInput"
                name="categoryId"
                defaultValue={result.query.categoryId ?? "all"}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (up to {formatMinutes(c.maxBookingMinutes)})
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Section */}
            <div className="space-y-1">
              <label
                htmlFor="sectionInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Section
              </label>
              <select
                id="sectionInput"
                name="sectionId"
                defaultValue={result.query.sectionId ?? "all"}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              >
                <option value="all">All sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. People (only rooms or all) */}
            <div className="space-y-1">
              <label
                htmlFor="peopleInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                People <span className="text-slate-500 font-normal normal-case">(Rooms)</span>
              </label>
              <input
                type="number"
                id="peopleInput"
                name="people"
                min={1}
                max={500}
                placeholder={showPeopleInput ? "e.g. 15" : "N/A"}
                disabled={!showPeopleInput}
                defaultValue={result.query.people ?? ""}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none disabled:opacity-40"
              />
            </div>

            {/* 8. Search Name */}
            <div className="space-y-1">
              <label
                htmlFor="qInput"
                className="text-xs font-bold text-slate-300 uppercase tracking-wider block"
              >
                Search by name
              </label>
              <input
                type="text"
                id="qInput"
                name="q"
                placeholder="e.g. PCR, Cabinet, Room"
                defaultValue={result.query.q ?? ""}
                className="w-full h-9 px-3 rounded-lg bg-[#060e1d] border border-[#334155] text-slate-100 text-xs font-mono focus:border-[#6cd8cb] outline-none"
              />
            </div>
          </div>

          {/* Form Bottom Row: Free Only & Submit */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#334155]/60">
            <label
              htmlFor="freeOnlyInput"
              className="inline-flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-200 select-none"
            >
              <input
                type="checkbox"
                id="freeOnlyInput"
                name="freeOnly"
                value="1"
                defaultChecked={result.query.freeOnly}
                className="size-4 rounded bg-[#060e1d] border-[#334155] text-[#6cd8cb] focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Free resources only</span>
            </label>

            <div className="flex items-center gap-2.5">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-mono text-slate-400 hover:text-white h-9"
              >
                <Link href="/book">
                  <RotateCcw className="size-3.5 mr-1.5" />
                  <span>Reset</span>
                </Link>
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-9 px-5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-bold text-xs font-mono shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <Filter className="size-3.5 mr-1.5" />
                <span>Find slots</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Result Line (aria-live="polite") */}
      <div
        aria-live="polite"
        className="flex items-center justify-between px-1 text-xs font-mono text-slate-400"
      >
        <div>
          <span className="font-bold text-slate-100">
            {result.counts.available} of {result.counts.total} free
          </span>{" "}
          at {currentSiteName} &bull; <span className="text-[#6cd8cb]">{formattedRange}</span>
        </div>
      </div>

      {/* Empty State: No resources matched filters at all */}
      {result.counts.total === 0 && (
        <div className="py-12 px-4 rounded-xl border border-dashed border-[#334155] bg-[#141c2b]/50 text-center space-y-3">
          <CalendarSearch className="size-10 text-slate-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-200">No resources match these filters.</p>
          <p className="text-xs text-slate-400">
            Try adjusting your search criteria, clearing search text, or selecting another site.
          </p>
          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-mono border-[#334155] bg-[#18202f] text-[#6cd8cb] hover:text-white"
            >
              <Link href="/book">Clear filters</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Empty State: Nothing is free at this time slot */}
      {result.counts.total > 0 && result.counts.available === 0 && !result.query.freeOnly && (
        <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-200 text-xs font-mono flex items-center justify-between gap-3">
          <span>
            Nothing is free at {result.query.start}. Try the suggested times below or choose another
            site.
          </span>
        </div>
      )}

      {/* Empty State: Free-only toggle is active but nothing free */}
      {result.counts.total > 0 && result.counts.available === 0 && result.query.freeOnly && (
        <div className="py-12 px-4 rounded-xl border border-dashed border-[#334155] bg-[#141c2b]/50 text-center space-y-3">
          <Clock className="size-10 text-amber-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-200">
            No free resources at {result.query.start}.
          </p>
          <p className="text-xs text-slate-400">
            Turn off &quot;Free resources only&quot; to inspect upcoming available times and
            suggestions.
          </p>
          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-mono border-[#334155] bg-[#18202f] text-[#6cd8cb] hover:text-white"
            >
              <Link
                href={`/book?date=${result.query.date}&start=${result.query.start}&duration=${result.query.duration}&siteId=${result.query.siteId}`}
              >
                Show busy resources with suggestions
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Resource Cards List */}
      {result.items.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.items.map((item) => {
            const isOutOfService = item.state === "OUT_OF_SERVICE";
            const isAvailable = item.state === "AVAILABLE";
            const isBusy = item.state === "BUSY";

            return (
              <li
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-colors ${
                  isOutOfService
                    ? "border-rose-900/50 bg-[#141c2b]/40 opacity-70"
                    : isAvailable
                      ? "border-[#334155] bg-[#141c2b] hover:border-[#6cd8cb]/50 shadow-xs"
                      : "border-[#334155] bg-[#141c2b] shadow-xs"
                }`}
              >
                {/* Card Top: Header & Specs */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon
                        iconKey={item.category.iconKey}
                        className="size-10 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-100 truncate hover:text-[#6cd8cb] transition-colors">
                          <Link href={`/resources/${item.id}`}>{item.name}</Link>
                        </h2>
                        <p className="text-xs text-slate-400 truncate">
                          {item.category.name} &bull; {item.section.name}
                        </p>
                      </div>
                    </div>

                    <ResourceStatusTag status={item.status} />
                  </div>

                  {/* Metadata Chips: Site, Location, Limit, Capacity */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="size-3 text-slate-500 shrink-0" />
                      <span>{item.site.name}</span>
                      {item.location ? ` (${item.location})` : ""}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3 text-slate-500 shrink-0" />
                      <span>Up to {formatMinutes(item.category.maxBookingMinutes)}</span>
                    </span>

                    {item.capacity ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <UsersIcon className="size-3 shrink-0" />
                        <span>{item.capacity} seats</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Bottom: State Specific Actions */}
                <div className="pt-3 border-t border-[#334155]/60 flex flex-col justify-end gap-2">
                  {/* Case 1: AVAILABLE */}
                  {isAvailable && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                        <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Free</span>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="h-8 px-3.5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-bold text-xs font-mono shadow-xs active:scale-95 transition-all"
                      >
                        <Link href={item.bookHref}>
                          Book {result.query.start} to {labTimeString(result.requestedEndAt, zone)}
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Case 2: BUSY */}
                  {isBusy && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-amber-400 font-bold">
                          {item.stateReason ?? "Booked"}
                        </span>
                        {item.suggestions.length > 0 ? (
                          <span className="text-[11px] text-slate-400">Next free times:</span>
                        ) : null}
                      </div>

                      {item.suggestions.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.suggestions.map((s) => (
                            <Button
                              key={s.href}
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs font-mono bg-[#18202f] border-[#334155] hover:border-[#6cd8cb] text-[#6cd8cb] hover:text-white hover:bg-[#222a3a] transition-all"
                            >
                              <Link href={s.href} aria-label={s.ariaLabel}>
                                {s.label}
                              </Link>
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic font-mono">
                          No other free time this day
                        </p>
                      )}
                    </div>
                  )}

                  {/* Case 3: OUT_OF_SERVICE */}
                  {isOutOfService && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
                        Out of service
                      </span>
                      <span className="text-[11px] text-slate-500 italic font-mono">
                        Unavailable for booking
                      </span>
                    </div>
                  )}

                  {/* Case 4: TOO_LONG */}
                  {item.state === "TOO_LONG" && (
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-slate-400">
                        {item.stateReason ??
                          `Can be booked for up to ${formatMinutes(item.category.maxBookingMinutes)}`}
                      </span>
                    </div>
                  )}

                  {/* Case 5: TOO_SMALL */}
                  {item.state === "TOO_SMALL" && (
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-slate-400">
                        {item.stateReason ?? `Seats ${item.capacity}`}
                      </span>
                    </div>
                  )}

                  {/* Case 6: CALIBRATION */}
                  {item.state === "CALIBRATION" && (
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <span className="text-amber-400 font-medium">
                        {item.stateReason ?? "Calibration due"}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
