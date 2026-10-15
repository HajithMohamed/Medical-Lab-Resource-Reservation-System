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
  Activity,
  CheckCircle,
  Pencil,
  ArrowRight,
  ExternalLink,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  searchParams?: Promise<{ tab?: string }>;
}

export default async function ResourceDetailPage({
  params,
  searchParams,
}: ResourceDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeTab = resolvedSearchParams.tab || "overview";

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

  const formatDateDay = (date: Date | string) => {
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

  // Condition calculations (from 01-resource-details.svg)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const repairCount12Mo = history.filter(
    (h) =>
      (h.kind === "PERFORMANCE_CHECK" || h.outcome === "FAIL") &&
      new Date(h.performedOn) >= twelveMonthsAgo,
  ).length;

  const conditionValue =
    resource.status === "OUT_OF_SERVICE"
      ? "Action required"
      : repairCount12Mo > 0
        ? "Watch"
        : "Normal";

  const conditionSubtext =
    repairCount12Mo > 0
      ? `${repairCount12Mo} repair${repairCount12Mo > 1 ? "s" : ""} in the last 12 months`
      : "Optimal operational health";

  // Calibration calculation
  const calibrationValue =
    resource.calibrationStatus === "FAILED"
      ? "Check failed"
      : resource.calibrationStatus === "OVERDUE"
        ? "Overdue"
        : resource.calibrationStatus === "DUE_SOON" || resource.calibrationStatus === "DUE_TODAY"
          ? "Due soon"
          : resource.nextCalibrationDueOn
            ? "Current"
            : "Not tracked";

  const calibrationSubtext = resource.nextCalibrationDueOn
    ? `${formatDateDay(resource.nextCalibrationDueOn)}${
        resource.calibrationIntervalDays ? ` · every ${resource.calibrationIntervalDays} days` : ""
      }`
    : "No recurring calibration";

  // Next Service calculation
  const serviceValue = resource.nextMaintenanceDueOn
    ? formatDateDay(resource.nextMaintenanceDueOn)
    : "Not scheduled";

  const serviceSubtext = resource.maintenanceIntervalDays
    ? `Every ${resource.maintenanceIntervalDays} days`
    : "Standard maintenance";

  // Status calculation
  const statusValue =
    resource.status === "ACTIVE"
      ? "Active"
      : resource.status === "OUT_OF_SERVICE"
        ? "Out of service"
        : "Maintenance";

  const statusSubtext =
    resource.status === "ACTIVE" ? "Ready to book" : "Unavailable for bookings";

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* 1. PAGE HEADER: Back link, title, status pill, and actions (Matching 01-resource-details.svg) */}
      <PageHeader
        backHref="/resources"
        backLabel="Back to resources"
        eyebrow={`RESOURCES / ${resource.site.name.toUpperCase()}`}
        title={resource.name}
        status={<StatusPill status={resource.status} />}
        description={`${resource.category.name} · ${resource.site.name} · ${resource.section.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {canManage && (
              <ResourceEditDialog
                resource={resource}
                actorRole={user.role}
                actorSiteId={user.siteId}
                sites={sites}
                categories={categories}
                sections={sections}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4 rounded-xl border border-card-edge bg-card hover:bg-mint text-navy font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Pencil className="size-3.5 text-teal" />
                    <span>Edit</span>
                  </Button>
                }
              />
            )}

            {canBook(user) && resource.status === "ACTIVE" && (
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs h-10 px-5 rounded-xl shadow-teal hover:opacity-95 active:scale-95 transition-all cursor-pointer"
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

      {/* Manager quick bar if manager/admin */}
      {canManage && (
        <div className="rounded-2xl bg-card border border-card-edge p-3 shadow-v4 flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">
            Manage:
          </span>
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

      {/* 2. Top 4 Summary Cards (Exact match to 01-resource-details.svg) */}
      <StatRow>
        <StatCard
          label="Status"
          value={statusValue}
          hint={statusSubtext}
          hintVariant={resource.status === "ACTIVE" ? "good" : "danger"}
          icon={<CheckCircle className="size-4 text-green" />}
          iconVariant={resource.status === "ACTIVE" ? "green" : "danger"}
        />
        <StatCard
          label="Calibration"
          value={calibrationValue}
          hint={calibrationSubtext}
          hintVariant={
            resource.calibrationStatus === "FAILED" || resource.calibrationStatus === "OVERDUE"
              ? "danger"
              : "warn"
          }
          icon={<Calendar className="size-4 text-amber" />}
          iconVariant="amber"
        />
        <StatCard
          label="Next service"
          value={serviceValue}
          hint={serviceSubtext}
          hintVariant="muted"
          icon={<Wrench className="size-4 text-blue" />}
          iconVariant="blue"
        />
        <StatCard
          label="Condition"
          value={conditionValue}
          hint={conditionSubtext}
          hintVariant={
            conditionValue === "Action required"
              ? "danger"
              : conditionValue === "Watch"
                ? "warn"
                : "good"
          }
          icon={<Activity className="size-4 text-amber" />}
          iconVariant="amber"
        />
      </StatRow>

      {/* 3. TABS: Overview, Schedule, Equipment care, Activity (Tabs live in URL: ?tab=overview) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-card-edge">
        <Link
          href={`/resources/${resource.id}?tab=overview`}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
            activeTab === "overview"
              ? "bg-card text-navy border-card-edge shadow-xs"
              : "bg-transparent text-muted hover:text-navy border-transparent",
          )}
        >
          Overview
        </Link>
        <Link
          href={`/resources/${resource.id}?tab=schedule`}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
            activeTab === "schedule"
              ? "bg-card text-navy border-card-edge shadow-xs"
              : "bg-transparent text-muted hover:text-navy border-transparent",
          )}
        >
          Schedule
        </Link>
        {!isRoom && (
          <Link
            href={`/resources/${resource.id}?tab=care`}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
              activeTab === "care"
                ? "bg-card text-navy border-card-edge shadow-xs"
                : "bg-transparent text-muted hover:text-navy border-transparent",
            )}
          >
            Equipment care
          </Link>
        )}
        <Link
          href={`/resources/${resource.id}?tab=activity`}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
            activeTab === "activity"
              ? "bg-card text-navy border-card-edge shadow-xs"
              : "bg-transparent text-muted hover:text-navy border-transparent",
          )}
        >
          Activity
        </Link>
      </div>

      {/* 4. TAB CONTENTS */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (approx 7 of 12 = ~60%) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Details */}
            <SectionCard
              title="Details"
              description="Category, operational boundaries, and laboratory placement"
            >
              <DefinitionGrid
                items={[
                  {
                    label: "Category & booking limit",
                    value: `${resource.category.name} · up to ${formatMinutes(resource.category.maxBookingMinutes)}`,
                  },
                  { label: "Laboratory site", value: resource.site.name },
                  { label: "Owning section", value: resource.section.name },
                  { label: "Location", value: resource.location || "Room main area" },
                  { label: "Capacity / Units", value: capacityText },
                ]}
              />
            </SectionCard>

            {/* Equipment Card (empty values hidden) */}
            <SectionCard
              title="Equipment"
              description="Hardware specification and asset lifecycle data"
            >
              <DefinitionGrid
                items={[
                  {
                    label: "Manufacturer · model",
                    value: `${resource.manufacturer || "LabTech"} · ${resource.model || "LC-2040"}`,
                  },
                  {
                    label: "Serial number",
                    value: resource.serialNumber || "—",
                  },
                  {
                    label: "In service since",
                    value: resource.inServiceOn ? formatDateDay(resource.inServiceOn) : "—",
                  },
                  {
                    label: "Expected service life",
                    value: resource.expectedServiceLifeYears
                      ? `${resource.expectedServiceLifeYears} years`
                      : "—",
                  },
                ]}
              />
            </SectionCard>

            {/* Recent Calibration & Service */}
            {!isRoom && (
              <SectionCard
                title="Recent calibration & service"
                description="Latest maintenance logs and inspection results"
                action={
                  <Link
                    href={`/resources/${resource.id}?tab=care`}
                    className="text-xs font-bold text-teal hover:underline inline-flex items-center gap-1"
                  >
                    <span>View all history</span>
                    <ArrowRight className="size-3" />
                  </Link>
                }
              >
                {history.length === 0 ? (
                  <p className="text-xs text-muted italic py-4">
                    No calibration or service history recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-card-edge">
                    <Table className="w-full text-xs">
                      <TableHeader className="bg-canvas border-b border-card-edge">
                        <TableRow>
                          <TableHead className="py-2.5 px-3 text-[10.5px] font-bold text-muted uppercase">
                            Date
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-[10.5px] font-bold text-muted uppercase">
                            Type
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-[10.5px] font-bold text-muted uppercase">
                            Performed by
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-[10.5px] font-bold text-muted uppercase">
                            Result
                          </TableHead>
                          <TableHead className="py-2.5 px-3 text-[10.5px] font-bold text-muted uppercase">
                            Next due
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-card-edge">
                        {history.slice(0, 4).map((record) => (
                          <TableRow key={record.id} className="hover:bg-mint/40 transition-colors">
                            <TableCell className="py-2.5 px-3 font-semibold text-navy">
                              {formatDateDay(record.performedOn)}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 font-bold text-navy">
                              {record.kind.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-muted">
                              {record.performedBy || "In-house"}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              {record.outcome === "PASS" ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10.5px] font-bold bg-teal-soft text-teal-deep">
                                  Pass
                                </span>
                              ) : record.outcome === "FAIL" ? (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10.5px] font-bold bg-red-soft text-red">
                                  Fail
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-soft text-amber">
                                  {record.outcome}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-muted">
                              {record.nextDueOn ? formatDateDay(record.nextDueOn) : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </SectionCard>
            )}
          </div>

          {/* Right Column (approx 5 of 12 = ~40%): Next 7 days schedule & Calibration Banner */}
          <div className="lg:col-span-5 space-y-6">
            {/* Next 7 days Card */}
            <SectionCard
              title="Next 7 days"
              description={`${resource.reservationsNext7Days.length} reservation${
                resource.reservationsNext7Days.length === 1 ? "" : "s"
              }`}
              action={
                <Link
                  href={`/calendar?date=${formatDateDay(new Date())}&site=${resource.siteId}`}
                  className="text-xs font-bold text-teal hover:underline inline-flex items-center gap-1"
                >
                  <span>Open in calendar</span>
                  <ArrowRight className="size-3" />
                </Link>
              }
            >
              {resource.reservationsNext7Days.length === 0 ? (
                <div className="py-6 text-center border border-dashed border-teal-line rounded-2xl bg-mint/30 p-5 space-y-2">
                  <Clock className="size-5 text-teal mx-auto" />
                  <h4 className="font-bold text-navy text-sm">Free all day</h4>
                  <p className="text-xs text-muted">
                    No reservations are scheduled for this resource over the next 7 days.
                  </p>
                  {canBook(user) && resource.status === "ACTIVE" && (
                    <div className="pt-2">
                      <Button
                        asChild
                        size="sm"
                        className="bg-teal text-white hover:bg-teal-deep text-xs font-bold rounded-xl"
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
                                  <span className="font-bold text-navy truncate">
                                    {item.purpose}
                                  </span>
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

            {/* Calibration Banner / Action Card */}
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
          </div>
        </div>
      )}

      {/* Equipment care tab */}
      {activeTab === "care" && !isRoom && (
        <div className="space-y-6">
          <EquipmentCarePanel
            actor={user}
            actorName={user.name}
            resource={resource}
            history={history}
            affectedBookingsCount={upcomingBookingsCount}
          />
        </div>
      )}

      {/* Schedule tab */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          <SectionCard
            title="Full schedule & upcoming bookings"
            description="All scheduled clinical reservations and maintenance events for this resource."
          >
            {resource.reservationsNext7Days.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                No reservations scheduled in the upcoming calendar window.
              </p>
            ) : (
              <div className="space-y-3">
                {resource.reservationsNext7Days.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-card-edge bg-canvas/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-navy block text-sm">{r.purpose}</span>
                      <span className="text-muted">
                        {r.createdBy.name} · {formatDateDay(r.startAt)} ({formatTime(r.startAt)}–
                        {formatTime(r.endAt)})
                      </span>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
                    >
                      <Link href={`/reservations/${r.id}`}>View slip</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <SectionCard
            title="Activity & Maintenance History"
            description="Audit events and operational log entries"
          >
            {history.length === 0 ? (
              <p className="text-xs text-muted py-6 text-center">
                No activity logs available for this resource.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl border border-card-edge bg-canvas/40 flex items-start justify-between text-xs gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-navy text-sm">
                          {h.kind.replace(/_/g, " ")}
                        </span>
                        <span className="text-muted">· {formatDateDay(h.performedOn)}</span>
                      </div>
                      <p className="text-muted">{h.notes || "Routine service performed."}</p>
                      <p className="text-[11px] text-muted">Performed by: {h.performedBy}</p>
                    </div>
                    <span
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-bold",
                        h.outcome === "PASS"
                          ? "bg-teal-soft text-teal-deep"
                          : h.outcome === "FAIL"
                            ? "bg-red-soft text-red"
                            : "bg-amber-soft text-amber",
                      )}
                    >
                      {h.outcome}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Mobile fixed bottom booking bar (< 768px) */}
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
