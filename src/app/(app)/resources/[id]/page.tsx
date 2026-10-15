import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Wrench,
  AlertOctagon,
  CalendarPlus,
  Calendar,
  Clock,
  ShieldAlert,
  Layers,
  MapPin,
  Users,
  CheckCircle,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getResource } from "@/services/resources";
import {
  canBook,
  canManageResource,
  canChangeResourceStatus,
  canWatchResource,
} from "@/lib/permissions";
import { StatusPill } from "@/components/resource-status-tag";
import { WatchButton } from "@/components/notifications/watch-button";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatRow, StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import { DefinitionGrid } from "@/components/ui/definition-grid";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { formatMinutes } from "@/lib/format";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { ResourceEditDialog } from "@/components/resources/resource-edit-dialog";
import { DueDayBanner } from "@/components/equipment/due-day-banner";
import { EquipmentCarePanel } from "@/components/equipment/equipment-care-panel";
import * as equipmentService from "@/services/equipment";
import { countUpcomingBookings } from "@/services/resources";
import { dbToDay } from "@/lib/equipment-dates";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getResource(id);
  if (!result.ok || !result.data) {
    return { title: "Resource not found | BenchBook" };
  }
  return {
    title: `${result.data.name} | BenchBook`,
  };
}

interface ResourceDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourceDetailPage({ params }: ResourceDetailPageProps) {
  const { id } = await params;
  const user = await requireUser();

  const result = await getResource(id);
  if (!result.ok || !result.data) {
    notFound();
  }

  const resource = result.data;
  const canManage = canManageResource(user, resource);

  const [sites, categories, sections, historyResult, upcomingBookingsCount, activeWatchCount] =
    await Promise.all([
      canManage
        ? db.site.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
      canManage
        ? db.category.findMany({
            select: { id: true, name: true, maxBookingMinutes: true, iconKey: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      canManage
        ? db.section.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
      equipmentService.getEquipmentHistory(resource.id),
      countUpcomingBookings(resource.id),
      canWatchResource(user) && resource.status === "OUT_OF_SERVICE"
        ? db.resourceWatch.count({
            where: {
              userId: user.id,
              resourceId: resource.id,
              kind: "BACK_IN_SERVICE",
              status: "ACTIVE",
            },
          })
        : Promise.resolve(0),
    ]);

  const isWatchingBackInService = activeWatchCount > 0;

  const history = historyResult.ok ? historyResult.data : [];
  const lastNotDoneCalib = history.find(
    (h) => h.kind === "CALIBRATION" && h.outcome === "NOT_DONE",
  );
  const lastNotDoneMaint = history.find(
    (h) => h.kind === "PREVENTIVE_MAINTENANCE" && h.outcome === "NOT_DONE",
  );

  const timeZone = env.APP_TIME_ZONE;

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(new Date(date));
  };

  const formatDateDay = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone,
    }).format(new Date(date));
  };

  // Group next 7 days reservations by day string (e.g. "Tue 13 Oct")
  const reservationsByDay = new Map<string, typeof resource.reservationsNext7Days>();
  for (const reservation of resource.reservationsNext7Days) {
    const dayKey = formatDateDay(reservation.startAt);
    const existing = reservationsByDay.get(dayKey) ?? [];
    existing.push(reservation);
    reservationsByDay.set(dayKey, existing);
  }

  const isRoom = resource.category.iconKey === "room";
  const capacityText = isRoom && resource.capacity ? `${resource.capacity} seats` : "1 unit";

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* 1. PAGE HEADER: Back link, title, status pill, and actions */}
      <PageHeader
        backHref="/resources"
        backLabel="Back to resources"
        eyebrow={`${resource.site.name} / ${resource.section.name}`}
        title={resource.name}
        status={<StatusPill status={resource.status} />}
        description={`${resource.category.name} · Limit: ${formatMinutes(resource.category.maxBookingMinutes)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canBook(user) && resource.status === "ACTIVE" && (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs h-10 px-5 rounded-xl shadow-xs hover:opacity-95"
              >
                <Link href={`/bookings/new?resourceId=${resource.id}`}>
                  <CalendarPlus className="size-4 mr-1.5" />
                  <span>Book this resource</span>
                </Link>
              </Button>
            )}

            {canWatchResource(user) && resource.status === "OUT_OF_SERVICE" && (
              <WatchButton
                resourceId={resource.id}
                resourceName={resource.name}
                kind="BACK_IN_SERVICE"
                size="lg"
                initialWatched={isWatchingBackInService}
              />
            )}
          </div>
        }
      />

      {/* Manager quick bar if manager */}
      {canManage && (
        <div className="rounded-[16px] bg-card border border-card-edge p-3 shadow-v4 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">
            Manage:
          </span>
          <ResourceEditDialog
            resource={resource}
            actorRole={user.role}
            actorSiteId={user.siteId}
            sites={sites}
            categories={categories}
            sections={sections}
          />
          {canChangeResourceStatus(user, resource) && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 border-card-edge bg-card hover:bg-canvas text-xs font-semibold text-navy rounded-lg"
            >
              <Link href={`/resources/${resource.id}/status`}>
                <AlertOctagon className="size-3.5 text-muted" />
                <span>Change status</span>
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 border-card-edge bg-card hover:bg-canvas text-xs font-semibold text-navy rounded-lg"
          >
            <Link
              href={`/maintenance/new?resourceId=${resource.id}&returnTo=${encodeURIComponent(`/resources/${resource.id}`)}`}
            >
              <Wrench className="size-3.5 text-muted" />
              <span>Block time</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 border-red/30 text-red bg-red-soft hover:bg-red/10 text-xs font-semibold rounded-lg"
          >
            <Link
              href={`/maintenance/new?resourceId=${resource.id}&breakdown=1&returnTo=${encodeURIComponent(`/resources/${resource.id}`)}`}
            >
              <ShieldAlert className="size-3.5" />
              <span>Report breakdown</span>
            </Link>
          </Button>
        </div>
      )}

      {/* 2. STAT ROW: 4 key facts (2x2 on phones, 4 cols on desktop) */}
      <StatRow>
        <StatCard
          label="Category"
          value={resource.category.name}
          hint={`Max: ${formatMinutes(resource.category.maxBookingMinutes)}`}
          hintVariant="muted"
          icon={<Layers className="size-4 text-teal" />}
        />
        <StatCard
          label="Capacity"
          value={capacityText}
          hint={resource.location ?? resource.site.name}
          hintVariant="muted"
          icon={
            isRoom ? (
              <Users className="size-4 text-teal" />
            ) : (
              <MapPin className="size-4 text-teal" />
            )
          }
        />
        <StatCard
          label="Bookings"
          value={resource.reservationsNext7Days.length}
          hint="Next 7 days"
          hintVariant="muted"
          icon={<Calendar className="size-4 text-blue" />}
        />
        <StatCard
          label="Status"
          value={resource.status === "ACTIVE" ? "Operational" : resource.status}
          hint={resource.status === "ACTIVE" ? "Available to book" : "Non-operational"}
          hintVariant={resource.status === "ACTIVE" ? "good" : "danger"}
          icon={<CheckCircle className="size-4 text-green" />}
        />
      </StatRow>

      {/* Due Day Banner if calibration or maintenance due */}
      <DueDayBanner
        actor={user}
        actorName={user.name}
        resource={resource}
        calibrationStatus={resource.calibrationStatus ?? "NOT_TRACKED"}
        maintenanceStatus={resource.maintenanceStatus ?? "NOT_TRACKED"}
        affectedBookingsCount={upcomingBookingsCount}
        lastNotDoneCalibration={
          lastNotDoneCalib
            ? {
                notes: lastNotDoneCalib.notes ?? "",
                plannedDate: lastNotDoneCalib.nextDueOn
                  ? dbToDay(lastNotDoneCalib.nextDueOn)
                  : null,
              }
            : null
        }
        lastNotDoneMaintenance={
          lastNotDoneMaint
            ? {
                notes: lastNotDoneMaint.notes ?? "",
                plannedDate: lastNotDoneMaint.nextDueOn
                  ? dbToDay(lastNotDoneMaint.nextDueOn)
                  : null,
              }
            : null
        }
      />

      {/* Equipment Care Panel for non-rooms */}
      {!isRoom && (
        <EquipmentCarePanel
          actor={user}
          actorName={user.name}
          resource={resource}
          history={history}
          affectedBookingsCount={upcomingBookingsCount}
        />
      )}

      {/* 3. TWO-COLUMN LAYOUT (≈ 60/40 on desktop, 1 col on phone) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (approx 7 of 12 = ~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Specifications & Location */}
          <SectionCard
            title="Specifications & location"
            description="Operational parameters and laboratory placement"
          >
            <DefinitionGrid
              items={[
                { label: "Category", value: resource.category.name },
                { label: "Laboratory site", value: resource.site.name },
                { label: "Owning section", value: resource.section.name },
                { label: "Location", value: resource.location || "Main floor" },
                { label: "Capacity / Units", value: capacityText },
                {
                  label: "Booking limit",
                  value: `Up to ${formatMinutes(resource.category.maxBookingMinutes)} per booking`,
                },
              ]}
            />
          </SectionCard>

          {/* Recent Maintenance Blocks */}
          <SectionCard
            title="Recent maintenance blocks"
            description="Service, calibration, and downtime records"
          >
            {resource.recentMaintenance.length === 0 ? (
              <p className="text-xs text-muted italic py-4">No maintenance blocks recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {resource.recentMaintenance.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl border border-card-edge bg-canvas/30 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-navy truncate">{m.purpose}</span>
                      <span className="text-muted font-medium shrink-0 tabular-nums">
                        {formatDateDay(m.startAt)}
                      </span>
                    </div>
                    <p className="text-muted">
                      {formatTime(m.startAt)}–{formatTime(m.endAt)} · logged by {m.createdBy.name}
                    </p>
                    {m.cancelReason && (
                      <p className="text-red font-medium">Cancelled: {m.cancelReason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right Column (approx 5 of 12 = ~40%): Next 7 days schedule */}
        <div className="lg:col-span-5 space-y-6">
          <SectionCard
            title="Schedule (next 7 days)"
            description={`${resource.reservationsNext7Days.length} reservation${
              resource.reservationsNext7Days.length === 1 ? "" : "s"
            } scheduled`}
          >
            {resource.reservationsNext7Days.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-teal-line rounded-2xl bg-mint/40 p-6 space-y-2">
                <Clock className="size-6 text-teal mx-auto" />
                <h4 className="font-bold text-navy text-sm">Free all week</h4>
                <p className="text-xs text-muted">
                  No reservations are scheduled for this resource over the next 7 days.
                </p>
                {canBook(user) && resource.status === "ACTIVE" && (
                  <div className="pt-2">
                    <Button
                      asChild
                      size="sm"
                      className="bg-teal text-white hover:bg-teal-deep text-xs font-bold rounded-lg"
                    >
                      <Link href={`/bookings/new?resourceId=${resource.id}`}>Book a slot</Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(reservationsByDay.entries()).map(([dayString, dayReservations]) => (
                  <div key={dayString} className="space-y-2">
                    <div className="text-[11px] font-extrabold text-muted uppercase tracking-wider">
                      {dayString}
                    </div>

                    <div className="space-y-2">
                      {dayReservations.map((item) => {
                        const isMaint = item.kind === "MAINTENANCE";

                        return (
                          <Link
                            key={item.id}
                            href={`/reservations/${item.id}`}
                            className={cn(
                              "p-3 rounded-xl border text-xs flex items-start justify-between gap-3 transition-colors",
                              isMaint
                                ? "border-amber-line bg-amber-soft text-amber hover:bg-amber-soft/80"
                                : "border-card-edge bg-card hover:bg-canvas text-navy shadow-2xs",
                            )}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isMaint && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-amber-strong text-white shrink-0">
                                    <Wrench className="size-2.5" />
                                    <span>Maint</span>
                                  </span>
                                )}
                                <span className="font-bold text-navy truncate">{item.purpose}</span>
                              </div>
                              <p className="text-muted text-[11px]">
                                {item.createdBy.name}
                                {item.attendeeCount ? ` · ${item.attendeeCount} attendees` : ""}
                              </p>
                            </div>

                            <span className="font-bold text-teal tabular-nums shrink-0">
                              {formatTime(item.startAt)}–{formatTime(item.endAt)}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* 4. MOBILE FIXED BOTTOM ACTION BAR (< 768px) */}
      {canBook(user) && resource.status === "ACTIVE" && (
        <div className="md:hidden">
          <StickyActionBar>
            <Link
              href={`/bookings/new?resourceId=${resource.id}`}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
            >
              <CalendarPlus className="size-4" />
              <span>Book this resource</span>
            </Link>
          </StickyActionBar>
        </div>
      )}
    </div>
  );
}
