import * as React from "react";
import Link from "next/link";
import {
  CalendarSearch,
  Clock,
  MapPin,
  Users as UsersIcon,
  RotateCcw,
  AlertTriangle,
  CalendarPlus,
} from "lucide-react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canBook, canWatchResource } from "@/lib/permissions";
import { db } from "@/lib/db";
import {
  findSlots,
  listBookingFilterOptions,
  type FindSlotsQueryInput,
} from "@/services/availability";
import { FIND_SLOT_DURATIONS_MINUTES, SLOT_MINUTES } from "@/config/rules";
import { formatMinutes } from "@/lib/format";
import { formatLabRange } from "@/lib/time";
import { CategoryIcon } from "@/components/category-icon";
import { StatusPill } from "@/components/resource-status-tag";
import { WatchButton } from "@/components/notifications/watch-button";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { AutoFilter } from "@/components/auto-filter";
import { cn } from "@/lib/utils";

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

  // Load dropdown master data in parallel via service
  const { sites, categories, sections } = await listBookingFilterOptions();

  const userCanWatch = canWatchResource(user);
  const activeWatches =
    userCanWatch && result.items.length > 0
      ? await db.resourceWatch.findMany({
          where: {
            userId: user.id,
            status: "ACTIVE",
            resourceId: { in: result.items.map((i) => i.id) },
          },
        })
      : [];

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

  // Resolved Site Name for results header
  const currentSiteName =
    result.query.siteId === "any"
      ? "all sites"
      : (sites.find((s) => s.id === result.query.siteId)?.name ?? "selected site");

  const formattedRange = formatLabRange(result.requestedStartAt, result.requestedEndAt);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace / Availability"
        title="Find a slot"
        description="Search live availability across laboratory resources and reserve without clashes."
      />

      {/* Fallback Note if requested times were adjusted */}
      {result.note && (
        <div
          role="status"
          className="p-3.5 rounded-xl border border-amber-line bg-amber-soft text-amber text-xs font-semibold flex items-center gap-2.5 animate-in fade-in"
        >
          <AlertTriangle className="size-4 text-amber-strong shrink-0" />
          <span>{result.note}</span>
        </div>
      )}

      {/* Search Filter Panel - Auto-filters immediately on dropdown selection without Apply button */}
      <div className="p-4 sm:p-5 rounded-[20px] border border-card-edge bg-card shadow-v4">
        <AutoFilter action="/book" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Date */}
            <div className="space-y-1">
              <label
                htmlFor="dateInput"
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Date <span className="text-teal">*</span>
              </label>
              <input
                type="date"
                id="dateInput"
                name="date"
                required
                defaultValue={result.query.date}
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
              />
            </div>

            {/* 2. Start Time */}
            <div className="space-y-1">
              <label
                htmlFor="startInput"
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Start time <span className="text-teal">*</span>
              </label>
              <select
                id="startInput"
                name="start"
                required
                defaultValue={result.query.start}
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
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
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Duration <span className="text-teal">*</span>
              </label>
              <select
                id="durationInput"
                name="duration"
                required
                defaultValue={result.query.duration}
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
              >
                {FIND_SLOT_DURATIONS_MINUTES.map((dur) => {
                  const isOverLimit = selectedCategory && dur > selectedCategory.maxBookingMinutes;
                  return (
                    <option key={dur} value={dur} disabled={Boolean(isOverLimit)}>
                      {formatDurationOption(dur)}
                      {isOverLimit
                        ? ` (over ${formatMinutes(selectedCategory.maxBookingMinutes)} limit)`
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
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Laboratory site
              </label>
              <select
                id="siteInput"
                name="siteId"
                defaultValue={result.query.siteId}
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
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
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Category
              </label>
              <select
                id="categoryInput"
                name="categoryId"
                defaultValue={result.query.categoryId ?? "all"}
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
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
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Section
              </label>
              <select
                id="sectionInput"
                name="sectionId"
                defaultValue={result.query.sectionId ?? "all"}
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
              >
                <option value="all">All sections</option>
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Attendees (if room) */}
            {showPeopleInput && (
              <div className="space-y-1">
                <label
                  htmlFor="peopleInput"
                  className="text-[11px] font-bold text-muted uppercase tracking-wider block"
                >
                  Attendees (rooms)
                </label>
                <input
                  type="number"
                  id="peopleInput"
                  name="people"
                  min="1"
                  max="100"
                  defaultValue={result.query.people ?? ""}
                  placeholder="e.g. 6"
                  className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
                />
              </div>
            )}

            {/* 8. Text Search */}
            <div className="space-y-1">
              <label
                htmlFor="qInput"
                className="text-[11px] font-bold text-muted uppercase tracking-wider block"
              >
                Resource name search
              </label>
              <input
                type="text"
                id="qInput"
                name="q"
                defaultValue={result.query.q ?? ""}
                placeholder="Search instrument..."
                className="w-full h-10 px-3 rounded-xl bg-canvas border border-card-edge text-navy text-xs font-medium focus:border-teal outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line">
            <label
              htmlFor="freeOnlyInput"
              className="flex items-center gap-2 text-xs font-bold text-navy cursor-pointer"
            >
              <input
                type="checkbox"
                id="freeOnlyInput"
                name="freeOnly"
                value="1"
                defaultChecked={result.query.freeOnly}
                className="size-4 rounded border-card-edge text-teal focus:ring-teal cursor-pointer"
              />
              <span>Free resources only</span>
            </label>

            <div className="flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-muted hover:text-navy h-9"
              >
                <Link href="/book">
                  <RotateCcw className="size-3.5 mr-1.5" />
                  <span>Reset filters</span>
                </Link>
              </Button>
            </div>
          </div>
        </AutoFilter>
      </div>

      {/* Result Summary Bar */}
      <div
        aria-live="polite"
        className="flex items-center justify-between px-1 text-xs text-muted font-medium"
      >
        <div>
          <span className="font-bold text-navy">
            {result.counts.available} of {result.counts.total} free
          </span>{" "}
          at {currentSiteName} · <span className="text-teal font-bold">{formattedRange}</span>
        </div>
      </div>

      {/* Empty State: No resources matched filters at all */}
      {result.counts.total === 0 && (
        <div className="py-12 px-4 rounded-[20px] border border-dashed border-card-edge bg-card text-center space-y-3 shadow-v4">
          <CalendarSearch className="size-10 text-muted mx-auto" />
          <h3 className="text-base font-bold text-navy">No resources match these filters</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Try adjusting your search criteria, clearing search text, or selecting another site.
          </p>
          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-bold border-card-edge bg-card text-teal hover:bg-canvas rounded-xl"
            >
              <Link href="/book">Clear filters</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Empty State: Nothing is free at this time slot */}
      {result.counts.total > 0 && result.counts.available === 0 && !result.query.freeOnly && (
        <div className="p-4 rounded-2xl border border-amber-line bg-amber-soft text-amber text-xs font-medium flex items-center justify-between gap-3 shadow-v4">
          <span>
            Nothing is free at {result.query.start}. Try the suggested times below or choose another
            site.
          </span>
        </div>
      )}

      {/* Empty State: Free-only toggle is active but nothing free */}
      {result.counts.total > 0 && result.counts.available === 0 && result.query.freeOnly && (
        <div className="py-12 px-4 rounded-[20px] border border-dashed border-card-edge bg-card text-center space-y-3 shadow-v4">
          <Clock className="size-10 text-amber-strong mx-auto" />
          <h3 className="text-base font-bold text-navy">
            No free resources at {result.query.start}
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Turn off &quot;Free resources only&quot; to inspect upcoming available times and
            suggestions.
          </p>
          <div className="pt-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-bold border-card-edge bg-card text-teal hover:bg-canvas rounded-xl"
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

      {/* Resource Cards Grid */}
      {result.items.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {result.items.map((item) => {
            const isOutOfService = item.state === "OUT_OF_SERVICE";
            const isAvailable = item.state === "AVAILABLE";
            const isBusy = item.state === "BUSY";

            return (
              <li
                key={item.id}
                className={cn(
                  "p-5 rounded-[20px] bg-card border border-card-edge shadow-v4 flex flex-col justify-between gap-4 transition-all hover:shadow-md",
                  isOutOfService && "opacity-75 bg-canvas/40",
                )}
              >
                {/* Card Top: Header & Specs */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal">
                        <CategoryIcon iconKey={item.category.iconKey} className="size-5 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-navy truncate hover:text-teal transition-colors">
                          <Link href={`/resources/${item.id}`}>{item.name}</Link>
                        </h3>
                        <p className="text-xs text-muted truncate">
                          {item.category.name} · {item.section.name}
                        </p>
                      </div>
                    </div>

                    <StatusPill status={item.status} />
                  </div>

                  {/* Metadata Chips: Site, Location, Limit, Capacity */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted font-medium">
                    <span className="inline-flex items-center gap-1 truncate">
                      <MapPin className="size-3 text-faint shrink-0" />
                      <span>{item.site.name}</span>
                      {item.location ? ` (${item.location})` : ""}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3 text-faint shrink-0" />
                      <span>Up to {formatMinutes(item.category.maxBookingMinutes)}</span>
                    </span>

                    {item.capacity ? (
                      <span className="inline-flex items-center gap-1 text-teal font-semibold">
                        <UsersIcon className="size-3 shrink-0" />
                        <span>{item.capacity} seats</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Card Bottom: State Specific Actions */}
                <div className="pt-3 border-t border-line flex flex-col justify-end gap-2.5">
                  {/* Case 1: AVAILABLE */}
                  {isAvailable && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-green">
                        <span className="size-2 rounded-full bg-green" />
                        <span>Free</span>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="h-9 px-4 bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all"
                      >
                        <Link href={item.bookHref}>
                          <CalendarPlus className="size-3.5 mr-1" />
                          <span>Book slot</span>
                        </Link>
                      </Button>
                    </div>
                  )}

                  {/* Case 2: BUSY */}
                  {isBusy && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-amber-strong font-bold">
                          {item.stateReason ?? "Booked"}
                        </span>
                        {item.suggestions.length > 0 && (
                          <span className="text-[11px] text-muted font-medium">Next free:</span>
                        )}
                      </div>

                      {item.suggestions.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.suggestions.map((s) => (
                            <Link
                              key={s.href}
                              href={s.href}
                              aria-label={s.ariaLabel}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-teal-soft border border-teal-line text-teal-deep hover:bg-teal hover:text-white transition-colors"
                            >
                              {s.label}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">No other free times today</p>
                      )}

                      {userCanWatch && (
                        <div className="pt-2 flex items-center justify-between gap-2 border-t border-line mt-1">
                          <span className="text-[11px] text-muted">Need this time?</span>
                          <WatchButton
                            resourceId={item.id}
                            resourceName={item.name}
                            kind="SLOT_FREE"
                            wantedStart={result.requestedStartAt.toISOString()}
                            wantedEnd={result.requestedEndAt.toISOString()}
                            durationMinutes={result.query.duration}
                            initialWatched={activeWatches.some(
                              (w) =>
                                w.resourceId === item.id &&
                                w.kind === "SLOT_FREE" &&
                                w.wantedStart?.getTime() === result.requestedStartAt.getTime(),
                            )}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Case 3: OUT_OF_SERVICE */}
                  {isOutOfService && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red bg-red-soft border border-red/20 px-2 py-0.5 rounded-lg">
                        Out of service
                      </span>
                      {userCanWatch ? (
                        <WatchButton
                          resourceId={item.id}
                          resourceName={item.name}
                          kind="BACK_IN_SERVICE"
                          initialWatched={activeWatches.some(
                            (w) => w.resourceId === item.id && w.kind === "BACK_IN_SERVICE",
                          )}
                        />
                      ) : (
                        <span className="text-[11px] text-muted italic">Unavailable</span>
                      )}
                    </div>
                  )}

                  {/* Case 4: Other constraints */}
                  {!isAvailable && !isBusy && !isOutOfService && (
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span>{item.stateReason ?? "Unavailable"}</span>
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
