import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Wrench,
  AlertOctagon,
  CalendarCheck,
  Calendar,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getResource } from "@/services/resources";
import { canManageSite } from "@/lib/permissions";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import { env } from "@/lib/env";

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
  const isManagerOrAdmin = canManageSite(user, resource.siteId);

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
  const capacityText =
    isRoom && resource.capacity ? `${resource.capacity} seats` : "Not applicable";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back button */}
      <div>
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Resources</span>
        </Link>

        {/* Resource Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
          <div className="flex items-center gap-3.5">
            <CategoryIcon
              iconKey={resource.category.iconKey}
              className="size-12 rounded-xl shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {resource.name}
                </h1>
                <ResourceStatusTag status={resource.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {resource.category.name} &bull; {resource.site.name} &bull; {resource.section.name}
              </p>
            </div>
          </div>

          {/* Primary Action: Book this resource */}
          {resource.status === "ACTIVE" && (
            <Button asChild size="lg" className="font-bold shrink-0 gap-2 shadow-xs">
              <Link href={`/bookings/new?resourceId=${resource.id}`}>
                <CalendarCheck className="size-5" />
                <span>Book this resource</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Manager Actions Row */}
      {isManagerOrAdmin && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-outline-variant bg-surface-container shadow-xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-on-surface-variant mr-1">
            Actions:
          </span>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-7.5 border-outline-variant bg-surface-container-low text-xs hover:bg-surface-container-high"
          >
            <Link href={`/resources/${resource.id}/edit`}>
              <Pencil className="size-3.5" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-7.5 border-outline-variant bg-surface-container-low text-xs hover:bg-surface-container-high"
          >
            <Link href={`/resources/${resource.id}/status`}>
              <AlertOctagon className="size-3.5" />
              <span>Status</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-7.5 border-outline-variant bg-surface-container-low text-xs hover:bg-surface-container-high"
          >
            <Link href={`/maintenance/new?resourceId=${resource.id}`}>
              <Wrench className="size-3.5" />
              <span>Block Maintenance</span>
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-7.5 border-error/40 text-error bg-surface-container-low text-xs hover:bg-error-container/20"
          >
            <Link href={`/maintenance/new?resourceId=${resource.id}&breakdown=1`}>
              <ShieldAlert className="size-3.5" />
              <span>Report Lockout</span>
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details panel */}
        <div className="lg:col-span-1 space-y-5">
          <Card className="rounded-lg bg-surface-container border border-outline-variant shadow-xs">
            <CardHeader className="pb-3 border-b border-outline-variant/60">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-on-surface-variant">
                Instrument Specifications
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <dl className="divide-y divide-outline-variant/40 text-xs font-mono">
                <div className="py-2.5 flex flex-col gap-0.5">
                  <dt className="text-on-surface-variant text-[11px]">Category & Limit</dt>
                  <dd className="font-semibold text-on-surface">
                    {resource.category.name} (max{" "}
                    {formatMinutes(resource.category.maxBookingMinutes)})
                  </dd>
                </div>
                <div className="py-2.5 flex flex-col gap-0.5">
                  <dt className="text-on-surface-variant text-[11px]">Laboratory Site</dt>
                  <dd className="font-semibold text-on-surface">{resource.site.name}</dd>
                </div>
                <div className="py-2.5 flex flex-col gap-0.5">
                  <dt className="text-on-surface-variant text-[11px]">Owning Section</dt>
                  <dd className="font-semibold text-on-surface">{resource.section.name}</dd>
                </div>
                <div className="py-2.5 flex flex-col gap-0.5">
                  <dt className="text-on-surface-variant text-[11px]">Physical Location</dt>
                  <dd className="font-semibold text-on-surface">
                    {resource.location ?? (
                      <span className="text-on-surface-variant/60 italic font-sans">Not set</span>
                    )}
                  </dd>
                </div>
                <div className="py-2.5 flex flex-col gap-0.5">
                  <dt className="text-on-surface-variant text-[11px]">Capacity</dt>
                  <dd className="font-semibold text-on-surface">{capacityText}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Recent Maintenance */}
          <Card className="rounded-lg bg-surface-container border border-outline-variant shadow-xs">
            <CardHeader className="pb-3 border-b border-outline-variant/60">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-tertiary flex items-center gap-2">
                <Wrench className="size-3.5" />
                <span>Recent Maintenance Logs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {resource.recentMaintenance.length === 0 ? (
                <p className="text-xs text-on-surface-variant/70 italic">
                  No maintenance blocks recorded.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {resource.recentMaintenance.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-tertiary/40 hazard-hatch-pattern text-xs space-y-1 bg-surface-container-low"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-tertiary truncate">{m.purpose}</span>
                        <span className="text-on-surface-variant shrink-0 font-mono text-[11px] tabular-nums">
                          {formatDateDay(m.startAt)}
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-[11px]">
                        {formatTime(m.startAt)} – {formatTime(m.endAt)} • logged by{" "}
                        {m.createdBy.name}
                      </p>
                      {m.cancelReason && (
                        <p className="text-error font-medium text-[11px]">
                          Cancelled: {m.cancelReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Next 7 days schedule */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="rounded-lg bg-surface-container border border-outline-variant shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-outline-variant/60">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-on-surface flex items-center gap-2">
                <Calendar className="size-3.5 text-primary" />
                <span>Next 7 Days Schedule Matrix</span>
              </CardTitle>
              <span className="font-mono text-[11px] text-on-surface-variant">
                {resource.reservationsNext7Days.length}{" "}
                {resource.reservationsNext7Days.length === 1 ? "run" : "runs"}
              </span>
            </CardHeader>
            <CardContent className="pt-3">
              {resource.reservationsNext7Days.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-outline-variant rounded-lg bg-surface-container-low">
                  <Clock className="size-8 text-outline mx-auto mb-2" />
                  <p className="text-sm font-semibold text-on-surface">
                    No confirmed runs in the next 7 days
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    This resource is available for reservation slots across the upcoming week.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(reservationsByDay.entries()).map(([dayString, dayReservations]) => (
                    <div key={dayString} className="space-y-2">
                      <div className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider px-1">
                        {dayString}
                      </div>

                      <div className="space-y-2">
                        {dayReservations.map((item) => {
                          const isMaint = item.kind === "MAINTENANCE";

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                                isMaint
                                  ? "border-l-2 border-l-tertiary border-tertiary/40 hazard-hatch-pattern bg-surface-container-low text-tertiary"
                                  : "border-l-2 border-l-primary border-outline-variant bg-surface-container-low hover:bg-surface-container-high transition-colors"
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isMaint ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary text-on-tertiary shrink-0">
                                      <Wrench className="size-2.5" />
                                      <span>MAINT</span>
                                    </span>
                                  ) : null}
                                  <span className="font-semibold text-on-surface truncate">
                                    {item.purpose}
                                  </span>
                                </div>
                                <p className="text-[11px] text-on-surface-variant">
                                  Reserved by {item.createdBy.name}
                                  {item.createdBy.site ? ` (${item.createdBy.site.name})` : ""}
                                  {item.attendeeCount ? ` • ${item.attendeeCount} attendees` : ""}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-bold text-primary tabular-nums">
                                  {formatTime(item.startAt)} – {formatTime(item.endAt)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
