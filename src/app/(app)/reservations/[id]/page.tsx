import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  User,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  XCircle,
  Building,
  Users,
  StopCircle,
  Calendar,
  Clock,
  ExternalLink,
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
import { StatCard } from "@/components/ui/stat-card";
import { SectionCard } from "@/components/ui/section-card";
import { DefinitionGrid } from "@/components/ui/definition-grid";
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/bookings"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline mb-2 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to My Bookings</span>
        </Link>

        <PageHeader
          eyebrow={`Reservation Slip • Ref #${reservation.id.slice(0, 8)}`}
          title={reservation.resource.name}
          description={`Scheduled slot at ${reservation.resource.site.name}`}
          actions={
            <div className="flex items-center gap-2">
              {isMaintenance ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-soft text-amber border border-amber/30">
                  <Wrench className="size-3" />
                  <span>Maintenance Block</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-soft text-teal border border-teal-soft">
                  <span>Standard Booking</span>
                </span>
              )}

              {isCancelled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-soft text-red border border-red/30">
                  <XCircle className="size-3" />
                  <span>Cancelled</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-soft text-teal-deep border border-teal-line">
                  <CheckCircle2 className="size-3" />
                  <span>Confirmed</span>
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Cancelled Notice Banner */}
      {isCancelled && (
        <div
          role="alert"
          className="rounded-2xl border border-red/30 bg-red-soft p-4 text-xs space-y-1.5"
        >
          <div className="flex items-center gap-2 font-bold text-red text-sm">
            <AlertTriangle className="size-4" />
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
        <div className="rounded-2xl border border-amber/30 bg-amber-soft p-4 text-xs text-amber font-medium flex items-center gap-2">
          <Wrench className="size-4 shrink-0" />
          <span>
            <strong>Maintenance Block:</strong> This instrument was reserved for scheduled
            calibration or engineering service.
          </span>
        </div>
      )}

      {/* 4 Stat Cards: Date, Time Window, Resource, Operator (2x2 on mobile, 4 on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Date"
          value={formatLabDate(reservation.startAt)}
          hint={process.env.APP_TIME_ZONE || "Asia/Colombo"}
          icon={Calendar}
          iconVariant="blue"
        />
        <StatCard
          label="Time window"
          value={formatTimeRange(reservation.startAt, reservation.endAt)}
          hint="Reserved window"
          icon={Clock}
          iconVariant="mint"
        />
        <StatCard
          label="Resource"
          value={reservation.resource.name}
          hint={reservation.resource.site.name}
          icon={Building}
          iconVariant="mint"
        />
        <StatCard
          label="Booked by"
          value={reservation.createdBy.name}
          hint={reservation.createdBy.role}
          icon={User}
          iconVariant="amber"
        />
      </div>

      {/* Booking Details & Resource Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reservation Details */}
        <SectionCard
          title="Reservation Details"
          description="Clinical reservation scope and location information."
        >
          <DefinitionGrid
            items={[
              {
                label: "Clinical Purpose",
                value: <span className="font-semibold text-navy">{reservation.purpose}</span>,
              },
              {
                label: "Laboratory Site",
                value: (
                  <div className="flex items-center gap-1.5 text-navy font-semibold">
                    <Building className="size-3.5 text-teal" />
                    <span>{reservation.resource.site.name}</span>
                  </div>
                ),
              },
              {
                label: "Owning Section",
                value: (
                  <div className="flex items-center gap-1.5 text-navy font-semibold">
                    <MapPin className="size-3.5 text-teal" />
                    <span>{reservation.resource.section.name}</span>
                    {reservation.resource.location && (
                      <span className="text-muted font-normal">
                        ({reservation.resource.location})
                      </span>
                    )}
                  </div>
                ),
              },
              ...(reservation.attendeeCount
                ? [
                    {
                      label: "Attendees",
                      value: (
                        <div className="flex items-center gap-1.5 text-navy font-semibold">
                          <Users className="size-3.5 text-teal" />
                          <span>{reservation.attendeeCount} attendees</span>
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

        {/* Resource & Equipment Specifications */}
        <SectionCard
          title="Equipment Information"
          description="Specifications and operating constraints."
          action={
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
            >
              <Link
                href={`/resources/${reservation.resource.id}`}
                className="flex items-center gap-1"
              >
                <span>View resource</span>
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          }
        >
          <DefinitionGrid
            items={[
              {
                label: "Category",
                value: reservation.resource.category.name,
              },
              {
                label: "Max booking duration",
                value: formatMinutes(reservation.resource.category.maxBookingMinutes),
              },
              {
                label: "Manufacturer",
                value: reservation.resource.manufacturer ?? "Not specified",
              },
              {
                label: "Model",
                value: reservation.resource.model ?? "Not specified",
              },
              {
                label: "Serial number",
                value: reservation.resource.serialNumber ?? "Not specified",
              },
              {
                label: "Status",
                value: reservation.resource.status.replace(/_/g, " "),
              },
            ]}
          />
        </SectionCard>
      </div>

      {/* Action Zone: Cancel Booking / End Maintenance Block */}
      {!isCancelled && (isCancellable || (isMaintenance && canManageMaint)) && (
        <div className="rounded-[20px] bg-card border border-card-edge p-5 sm:p-6 shadow-v4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-navy">Manage this reservation</h3>
            <p className="text-xs text-muted">
              {isMaintenance
                ? "Free the blocked schedule early if maintenance or calibration is complete."
                : "Cancel if your experiment plan changed so colleagues may use the slot."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Standard Booking Cancellation */}
            {!isMaintenance && isCancellable && (
              <ConfirmAction
                title="Cancel Reservation"
                description={`Are you sure you want to cancel this booking for ${reservation.resource.name}? The slot will immediately be freed for other lab technologists.`}
                confirmLabel="Cancel Reservation"
                isDestructive
                action={cancelBookingAction}
                trigger={
                  <Button
                    variant="outline"
                    className="h-11 px-5 rounded-xl text-red border-red/30 bg-red-soft hover:bg-red hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <XCircle className="size-4 mr-1.5" />
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

            {/* Maintenance Running: End Now */}
            {isRunningMaintenance && canManageMaint && (
              <ConfirmAction
                title="End Maintenance Block"
                description={`End the maintenance block for ${reservation.resource.name} now? The schedule will be shortened to the next 15-minute slot boundary, freeing the instrument for bookings.`}
                confirmLabel="End now"
                action={endBlockNowAction}
                trigger={
                  <Button
                    variant="outline"
                    className="h-11 px-5 rounded-xl text-amber border-amber/30 bg-amber-soft hover:bg-amber hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <StopCircle className="size-4 mr-1.5" />
                    <span>End block now</span>
                  </Button>
                }
              >
                <input type="hidden" name="blockId" value={reservation.id} />
                <input type="hidden" name="resourceId" value={reservation.resource.id} />
              </ConfirmAction>
            )}

            {/* Maintenance Future: Cancel Block */}
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
                    className="h-11 px-5 rounded-xl text-red border-red/30 bg-red-soft hover:bg-red hover:text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    <XCircle className="size-4 mr-1.5" />
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
        </div>
      )}
    </div>
  );
}
