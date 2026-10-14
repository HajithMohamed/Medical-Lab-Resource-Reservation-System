import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Wrench,
  AlertOctagon,
  CalendarCheck,
  Calendar,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getResource } from "@/services/resources";
import { canBook, canManageResource, canChangeResourceStatus } from "@/lib/permissions";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMinutes } from "@/lib/format";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { ResourceEditDialog } from "@/components/resources/resource-edit-dialog";

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

  const [sites, categories, sections] = canManage
    ? await Promise.all([
        db.site.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
        db.category.findMany({
          select: { id: true, name: true, maxBookingMinutes: true, iconKey: true },
          orderBy: { name: "asc" },
        }),
        db.section.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      ])
    : [[], [], []];

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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-[#6cd8cb] mb-3 transition-colors"
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
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                  {resource.name}
                </h1>
                <ResourceStatusTag status={resource.status} />
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {resource.category.name} &bull; {resource.site.name} &bull; {resource.section.name}
              </p>
            </div>
          </div>

          {/* Primary Action: Book this resource */}
          {canBook(user) && resource.status === "ACTIVE" && (
            <Button
              asChild
              size="lg"
              className="font-bold shrink-0 gap-2 bg-[#6cd8cb] text-[#003732] hover:bg-[#29a195] hover:text-[#002421] shadow-xs"
            >
              <Link href={`/bookings/new?resourceId=${resource.id}`}>
                <CalendarCheck className="size-5" />
                <span>Book this resource</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Manager Actions Row */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
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
              className="gap-1.5 h-8 border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-xs"
            >
              <Link href={`/resources/${resource.id}/status`}>
                <AlertOctagon className="size-3.5" />
                <span>Status</span>
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-xs"
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
            className="gap-1.5 h-8 border-rose-500/40 text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 text-xs"
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
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-[#141c2b] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-100">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-[#334155]/60 text-sm">
                <div className="py-2.5">
                  <dt className="text-xs text-slate-400 font-medium">Category & limit</dt>
                  <dd className="font-semibold text-slate-200 mt-0.5">
                    {resource.category.name} (up to{" "}
                    {formatMinutes(resource.category.maxBookingMinutes)})
                  </dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-400 font-medium">Laboratory site</dt>
                  <dd className="font-semibold text-slate-200 mt-0.5">{resource.site.name}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-400 font-medium">Owning section</dt>
                  <dd className="font-semibold text-slate-200 mt-0.5">{resource.section.name}</dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-400 font-medium">Location</dt>
                  <dd className="font-semibold text-slate-200 mt-0.5">
                    {resource.location ?? <span className="text-slate-500 italic">Not set</span>}
                  </dd>
                </div>
                <div className="py-2.5">
                  <dt className="text-xs text-slate-400 font-medium">Capacity</dt>
                  <dd className="font-semibold text-slate-200 mt-0.5">{capacityText}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Recent Maintenance */}
          <Card className="bg-[#141c2b] border-[#334155]">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
                <Wrench className="size-4 text-amber-400" />
                <span>Recent maintenance</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {resource.recentMaintenance.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No maintenance blocks recorded.</p>
              ) : (
                <div className="space-y-2.5">
                  {resource.recentMaintenance.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-[#334155] bg-[#18202f] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-200 truncate">{m.purpose}</span>
                        <span className="text-slate-400 font-mono shrink-0 tabular-nums">
                          {formatDateDay(m.startAt)}
                        </span>
                      </div>
                      <p className="text-slate-400">
                        {formatTime(m.startAt)} to {formatTime(m.endAt)} &bull; logged by{" "}
                        {m.createdBy.name}
                      </p>
                      {m.cancelReason && (
                        <p className="text-rose-400 font-medium">Cancelled: {m.cancelReason}</p>
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
          <Card className="bg-[#141c2b] border-[#334155]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-100">
                <Calendar className="size-4 text-[#6cd8cb]" />
                <span>Next 7 days</span>
              </CardTitle>
              <span className="text-xs text-slate-400 font-mono">
                {resource.reservationsNext7Days.length}{" "}
                {resource.reservationsNext7Days.length === 1 ? "run" : "runs"}
              </span>
            </CardHeader>
            <CardContent className="pt-3">
              {resource.reservationsNext7Days.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-[#334155] rounded-xl bg-[#18202f]/50">
                  <Clock className="size-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-200">
                    No bookings in the next 7 days
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    This resource is free for reservations throughout the upcoming week.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.from(reservationsByDay.entries()).map(([dayString, dayReservations]) => (
                    <div key={dayString} className="space-y-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                        {dayString}
                      </div>

                      <div className="space-y-2">
                        {dayReservations.map((item) => {
                          const isMaint = item.kind === "MAINTENANCE";

                          return (
                            <Link
                              key={item.id}
                              href={`/reservations/${item.id}`}
                              className={`p-3 rounded-lg border text-sm flex items-start justify-between gap-3 transition-colors ${
                                isMaint
                                  ? "border-amber-500/40 bg-amber-950/20 text-amber-200 hover:bg-amber-950/30"
                                  : "border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-slate-200"
                              }`}
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {isMaint ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-600 text-slate-950 shrink-0">
                                      <Wrench className="size-3" />
                                      <span>Maintenance</span>
                                    </span>
                                  ) : null}
                                  <span className="font-bold text-slate-100 truncate hover:text-[#6cd8cb] transition-colors">
                                    {item.purpose}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                  Booked by {item.createdBy.name}
                                  {item.createdBy.site ? ` (${item.createdBy.site.name})` : ""}
                                  {item.attendeeCount ? ` • ${item.attendeeCount} attendees` : ""}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono text-xs font-bold text-[#6cd8cb] tabular-nums">
                                  {formatTime(item.startAt)} – {formatTime(item.endAt)}
                                </span>
                              </div>
                            </Link>
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
