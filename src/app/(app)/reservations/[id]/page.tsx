import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  User,
  AlertTriangle,
  Wrench,
  XCircle,
  Building,
  Users,
  StopCircle,
  Calendar,
  Clock,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReservation } from "@/services/bookings";
import { canCancelReservation, canManageMaintenance } from "@/lib/permissions";
import { cancelBookingAction } from "@/actions/bookings";
import { endBlockNowAction, cancelMaintenanceBlockAction } from "@/actions/maintenance";
import { formatLabDate, formatTimeRange } from "@/lib/time";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { StatRow, StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DefinitionGrid } from "@/components/ui/definition-grid";
import { CategoryIcon } from "@/components/category-icon";
import { formatMinutes } from "@/lib/format";

export const metadata = {
  title: "Reservation Details | BenchBook",
  description: "View and manage clinical resource reservation details.",
};

interface ReservationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReservationPage({ params }: ReservationPageProps) {
  const user = await requireUser();
  const { id } = await params;

  const reservation = await getReservation(id);
  if (!reservation) {
    notFound();
  }

  const now = new Date();
  const isCancellable = canCancelReservation(user, reservation, now);
  const isCancelled = reservation.status === "CANCELLED";
  const isMaintenance = reservation.kind === "MAINTENANCE";
  const canManageMaint = canManageMaintenance(user, reservation.resource);
  const isRunningMaintenance =
    isMaintenance && !isCancelled && reservation.startAt <= now && reservation.endAt > now;
  const isFutureMaintenance = isMaintenance && !isCancelled && reservation.startAt > now;

  const statusBadge = isCancelled ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold tracking-wider bg-red-soft text-red border border-red/20 shadow-2xs">
      <span className="size-1.5 rounded-full bg-red shrink-0" />
      <span>CANCELLED</span>
    </span>
  ) : isMaintenance ? (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold tracking-wider bg-amber-soft text-amber border border-amber/30 shadow-2xs">
      <Wrench className="size-3" />
      <span>MAINTENANCE</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-extrabold tracking-wider bg-teal-soft text-teal-deep border border-teal-line shadow-2xs">
      <span className="size-1.5 rounded-full bg-teal shrink-0" />
      <span>CONFIRMED</span>
    </span>
  );

  const durationMinutes = Math.round(
    (reservation.endAt.getTime() - reservation.startAt.getTime()) / 60000,
  );
  const durationText = formatMinutes(durationMinutes);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Back button, Eyebrow, Title, Status badge, Subtitle and Actions */}
      <PageHeader
        backHref="/bookings"
        backLabel="Back to my bookings"
        eyebrow={`RESERVATION SLIP • REF #${reservation.id.slice(0, 8).toUpperCase()}`}
        title={reservation.resource.name}
        status={statusBadge}
        description={`Scheduled slot at ${reservation.resource.site.name} · ${reservation.resource.section.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border border-card-edge bg-card hover:bg-mint text-navy font-bold text-xs shadow-2xs gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Link href={`/resources/${reservation.resource.id}`}>
                <span>View resource</span>
                <ExternalLink className="size-3.5 text-teal" />
              </Link>
            </Button>

            {!isCancelled && isCancellable && (
              <ConfirmAction
                title="Cancel Reservation"
                description={`Are you sure you want to cancel this booking for ${reservation.resource.name}? The slot will immediately be freed for other lab technologists.`}
                confirmLabel="Cancel reservation"
                isDestructive
                action={cancelBookingAction}
                trigger={
                  <Button
                    variant="outline"
                    className="h-10 px-4 rounded-xl text-red border border-red/30 bg-red-soft hover:bg-red hover:text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="size-3.5" />
                    <span>Cancel booking</span>
                  </Button>
                }
              >
                <input type="hidden" name="reservationId" value={reservation.id} />
                <div className="space-y-1.5 pt-2 text-left">
                  <Label htmlFor="cancelReason" className="text-xs font-bold text-navy">
                    Reason for cancellation <span className="text-red">*</span>
                  </Label>
                  <Input
                    id="cancelReason"
                    name="reason"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="e.g. Samples not ready / Run postponed"
                    className="h-10 rounded-xl border-card-edge bg-card text-xs text-navy"
                  />
                  <p className="text-[11px] text-muted">
                    Required so colleagues and managers understand why the slot was freed.
                  </p>
                </div>
              </ConfirmAction>
            )}

            {isRunningMaintenance && canManageMaint && (
              <ConfirmAction
                title="End Maintenance Block"
                description={`End the maintenance block for ${reservation.resource.name} now? The schedule will be shortened to the next 15-minute slot boundary, freeing the instrument for bookings.`}
                confirmLabel="End now"
                action={endBlockNowAction}
                trigger={
                  <Button
                    variant="outline"
                    className="h-10 px-4 rounded-xl text-amber border border-amber/30 bg-amber-soft hover:bg-amber hover:text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <StopCircle className="size-3.5" />
                    <span>End block now</span>
                  </Button>
                }
              >
                <input type="hidden" name="blockId" value={reservation.id} />
                <input type="hidden" name="resourceId" value={reservation.resource.id} />
              </ConfirmAction>
            )}

            {isFutureMaintenance && canManageMaint && (
              <ConfirmAction
                title="Cancel Maintenance Block"
                description={`Are you sure you want to cancel this future maintenance block for ${reservation.resource.name}? The reserved time will be immediately freed for bookings.`}
                confirmLabel="Cancel block"
                isDestructive
                action={cancelMaintenanceBlockAction}
                trigger={
                  <Button
                    variant="outline"
                    className="h-10 px-4 rounded-xl text-red border border-red/30 bg-red-soft hover:bg-red hover:text-white font-bold text-xs shadow-2xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="size-3.5" />
                    <span>Cancel block</span>
                  </Button>
                }
              >
                <input type="hidden" name="blockId" value={reservation.id} />
                <input type="hidden" name="resourceId" value={reservation.resource.id} />
                <div className="space-y-1.5 pt-2 text-left">
                  <Label htmlFor="maintCancelReason" className="text-xs font-bold text-navy">
                    Reason for cancellation <span className="text-red">*</span>
                  </Label>
                  <Input
                    id="maintCancelReason"
                    name="reason"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="e.g. Service visit rescheduled by engineer"
                    className="h-10 rounded-xl border-card-edge bg-card text-xs text-navy"
                  />
                </div>
              </ConfirmAction>
            )}
          </div>
        }
      />

      {/* Cancelled Notice Banner */}
      {isCancelled && (
        <div
          role="alert"
          className="rounded-2xl border border-red/30 bg-red-soft p-4 text-xs space-y-1.5 animate-in fade-in"
        >
          <div className="flex items-center gap-2 font-bold text-red text-sm">
            <AlertTriangle className="size-4 shrink-0" />
            <span>This reservation was cancelled</span>
          </div>
          <p className="text-red">
            Cancelled by{" "}
            <span className="font-bold text-navy">
              {reservation.cancelledBy?.name ?? "a manager"}
            </span>
            {reservation.cancelledAt ? ` on ${formatLabDate(reservation.cancelledAt)}` : ""}.
          </p>
          <p className="pt-1 text-red font-medium">
            Reason:{" "}
            <span className="italic">{reservation.cancelReason ?? "No reason provided."}</span>
          </p>
        </div>
      )}

      {/* Maintenance Notice Banner */}
      {isMaintenance && !isCancelled && (
        <div className="rounded-2xl border border-amber/30 bg-amber-soft p-4 text-xs text-amber font-medium flex items-center gap-2 animate-in fade-in">
          <Wrench className="size-4 shrink-0" />
          <span>
            <strong>Maintenance Block:</strong> This instrument is reserved for scheduled
            calibration or engineering service.
          </span>
        </div>
      )}

      {/* 2. Top 4 Stat Cards: Date, Time Window, Resource, Operator (Matching 01-resource-details.svg StatRow) */}
      <StatRow>
        <StatCard
          label="Date"
          value={formatLabDate(reservation.startAt)}
          hint={process.env.APP_TIME_ZONE || "Asia/Colombo"}
          icon={Calendar}
          iconVariant="mint"
        />
        <StatCard
          label="Time window"
          value={formatTimeRange(reservation.startAt, reservation.endAt)}
          hint={`${durationText} reserved`}
          icon={Clock}
          iconVariant="amber"
        />
        <StatCard
          label="Resource"
          value={reservation.resource.name}
          hint={reservation.resource.site.name}
          icon={
            <CategoryIcon
              iconKey={reservation.resource.category.iconKey}
              className="size-4 text-teal"
            />
          }
          iconVariant="mint"
        />
        <StatCard
          label="Booked by"
          value={reservation.createdBy.name}
          hint={reservation.createdBy.role}
          icon={User}
          iconVariant="blue"
        />
      </StatRow>

      {/* 3. Two-Column Layout (≈ 60/40 on desktop, 1 col on phone) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (approx 7 of 12 = ~60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Reservation Details */}
          <SectionCard
            title="Reservation Details"
            description="Clinical reservation purpose and laboratory location."
            action={
              <Link
                href={`/calendar?date=${formatLabDate(reservation.startAt)}&site=${reservation.resource.siteId}`}
                className="text-xs font-bold text-teal hover:underline inline-flex items-center gap-1"
              >
                <span>View in calendar</span>
                <ArrowRight className="size-3" />
              </Link>
            }
          >
            <DefinitionGrid
              items={[
                {
                  label: "Clinical Purpose",
                  value: <span className="font-bold text-navy text-sm">{reservation.purpose}</span>,
                },
                {
                  label: "Laboratory Site",
                  value: (
                    <div className="flex items-center gap-1.5 text-navy font-semibold text-xs">
                      <Building className="size-3.5 text-teal" />
                      <span>{reservation.resource.site.name}</span>
                    </div>
                  ),
                },
                {
                  label: "Owning Section",
                  value: (
                    <div className="flex items-center gap-1.5 text-navy font-semibold text-xs">
                      <MapPin className="size-3.5 text-teal" />
                      <span>{reservation.resource.section.name}</span>
                    </div>
                  ),
                },
                {
                  label: "Location",
                  value: reservation.resource.location || "Main laboratory bench",
                },
                ...(reservation.attendeeCount
                  ? [
                      {
                        label: "Attendees",
                        value: (
                          <div className="flex items-center gap-1.5 text-navy font-semibold text-xs">
                            <Users className="size-3.5 text-teal" />
                            <span>{reservation.attendeeCount} persons</span>
                          </div>
                        ),
                      },
                    ]
                  : []),
                {
                  label: "Created by operator",
                  value: `${reservation.createdBy.name} (${reservation.createdBy.email})`,
                },
              ]}
            />
          </SectionCard>
        </div>

        {/* Right Column (approx 5 of 12 = ~40%) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Resource & Equipment Specifications */}
          <SectionCard
            title="Equipment & Policies"
            description="Operational constraints and hardware specifications."
          >
            <DefinitionGrid
              items={[
                {
                  label: "Category",
                  value: reservation.resource.category.name,
                },
                {
                  label: "Max booking duration",
                  value: `Up to ${formatMinutes(reservation.resource.category.maxBookingMinutes)}`,
                },
                ...(reservation.resource.capacity
                  ? [
                      {
                        label: "Capacity",
                        value: `${reservation.resource.capacity} ${
                          reservation.resource.category.iconKey === "room" ? "seats" : "units"
                        }`,
                      },
                    ]
                  : []),
                {
                  label: "Manufacturer",
                  value: reservation.resource.manufacturer ?? "—",
                },
                {
                  label: "Model",
                  value: reservation.resource.model ?? "—",
                },
                {
                  label: "Serial number",
                  value: reservation.resource.serialNumber ?? "—",
                },
                {
                  label: "Status",
                  value: reservation.resource.status.replace(/_/g, " "),
                },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
