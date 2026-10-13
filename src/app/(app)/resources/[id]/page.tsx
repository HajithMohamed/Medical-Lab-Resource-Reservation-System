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
        <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-border bg-card shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Manage:
          </span>
          <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
            <Link href={`/resources/${resource.id}/edit`}>
              <Pencil className="size-3.5" />
              <span>Edit</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
            <Link href={`/resources/${resource.id}/status`}>
              <AlertOctagon className="size-3.5" />
              <span>Change status</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
            <Link href={`/maintenance/new?resourceId=${resource.id}`}>
              <Wrench className="size-3.5" />
              <span>Block time</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5 h-8">
            <Link href={`/maintenance/new?resourceId=${resource.id}&breakdown=1`}>
              <ShieldAlert className="size-3.5" />
              <span>Report breakdown</span>
            </Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border/60 text-sm">
                <div className="py-2.5">
                  <dt className="text-xs text-muted-foreground font-medium">Category & limit</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {resource.category.name} (up to{" "}
                    {formatMinutes(resource.category.maxBookingMinutes)})
                  </dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-muted-foreground font-medium">Laboratory site</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{resource.site.name}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-muted-foreground font-medium">Owning section</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{resource.section.name}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-muted-foreground font-medium">Location</dt>
                  <dd className="font-semibold text-foreground mt-0.5">
                    {resource.location ?? (
                      <span className="text-muted-foreground italic">Not set</span>
                    )}
                  </dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-muted-foreground font-medium">Capacity</dt>
                  <dd className="font-semibold text-foreground mt-0.5">{capacityText}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Recent Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wrench className="size-4 text-amber-600" />
                <span>Recent maintenance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {resource.recentMaintenance.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No maintenance blocks recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {resource.recentMaintenance.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-border/80 bg-muted/20 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-foreground truncate">{m.purpose}</span>
                        <span className="text-muted-foreground shrink-0 tabular-nums">
                          {formatDateDay(m.startAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {formatTime(m.startAt)} to {formatTime(m.endAt)} &bull; logged by{" "}
                        {m.createdBy.name}
                      </p>
                      {m.cancelReason && (
                        <p className="text-destructive font-medium">Cancelled: {m.cancelReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Next 7 days schedule */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                <span>Next 7 days</span>
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {resource.reservationsNext7Days.length}{" "}
                {resource.reservationsNext7Days.length === 1 ? "booking" : "bookings"}
              </span>
            </CardHeader>
            <CardContent>
              {resource.reservationsNext7Days.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border rounded-xl bg-card">
                  <Clock className="size-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">
                    No bookings in the next 7 days
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This resource is free for reservations throughout the upcoming week.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Array.from(reservationsByDay.entries()).map(([dayString, dayReservations]) => (
                    <div key={dayString} className="space-y-2">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                        {dayString}
                      </div>

                      <div className="space-y-2">
                        {dayReservations.map((item) => {
                          const isMaint = item.kind === "MAINTENANCE";

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-lg border text-sm flex items-start justify-between gap-3 ${
                                isMaint
                                  ? "border-amber-600/40 bg-amber-500/10 text-amber-950 dark:text-amber-200"
                                  : "border-border bg-card hover:bg-muted/30"
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isMaint ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-white shrink-0">
                                      <Wrench className="size-3" />
                                      <span>Maintenance</span>
                                    </span>
                                  ) : null}
                                  <span className="font-bold text-foreground truncate">
                                    {item.purpose}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Booked by {item.createdBy.name}
                                  {item.createdBy.site ? ` (${item.createdBy.site.name})` : ""}
                                  {item.attendeeCount
                                    ? ` &bull; ${item.attendeeCount} attendees`
                                    : ""}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                                  {formatTime(item.startAt)} &ndash; {formatTime(item.endAt)}
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
