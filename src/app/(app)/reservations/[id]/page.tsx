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
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getReservation } from "@/services/bookings";
import { canCancelReservation, canManageMaintenance } from "@/lib/permissions";
import { cancelBookingAction } from "@/actions/bookings";
import { endBlockNowAction, cancelMaintenanceBlockAction } from "@/actions/maintenance";
import { formatLabRange, formatLabDate, formatTimeRange } from "@/lib/time";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Back button */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs font-mono text-[#94a3b8] hover:text-white"
        >
          <Link href="/bookings">
            <ArrowLeft className="size-3.5" />
            <span>Back to My Bookings</span>
          </Link>
        </Button>
      </div>

      {/* Main Specimen Label Panel */}
      <div
        className={`rounded-xl border bg-[#141c2b] shadow-lg overflow-hidden ${
          isCancelled
            ? "border-rose-500/40"
            : isMaintenance
              ? "border-amber-500/40"
              : "border-[#334155]"
        }`}
      >
        {/* Top Header Bar / Specimen Barcode Simulation */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#334155] bg-[#060e1d]">
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isCancelled
                  ? "bg-rose-400"
                  : isMaintenance
                    ? "bg-amber-400"
                    : "bg-[#6cd8cb] animate-pulse"
              }`}
            />
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-[#94a3b8]">
              Reservation Slip • Ref #{reservation.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isMaintenance ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                <Wrench className="size-3" />
                <span>Maintenance</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-medium bg-[#18202f] text-[#6cd8cb] border border-[#6cd8cb]/30">
                <span>Standard Booking</span>
              </span>
            )}

            {isCancelled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40">
                <XCircle className="size-3" />
                <span>Cancelled</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="size-3" />
                <span>Confirmed</span>
              </span>
            )}
          </div>
        </div>

        {/* Specimen Body */}
        <div className="p-6 space-y-6">
          {/* Cancelled Alert Box */}
          {isCancelled && (
            <div
              role="alert"
              className="p-4 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-200 text-xs font-mono space-y-1.5"
            >
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="size-4 text-rose-400" />
                <span>This reservation was cancelled</span>
              </div>
              <p>
                Cancelled by{" "}
                <span className="font-semibold text-white">
                  {reservation.cancelledBy?.name ?? "a manager"}
                </span>
                {reservation.cancelledAt ? ` on ${formatLabDate(reservation.cancelledAt)}` : ""}.
              </p>
              <p className="pt-1 text-[#f1f5f9]">
                Reason:{" "}
                <span className="italic">{reservation.cancelReason ?? "No reason provided."}</span>
              </p>
            </div>
          )}

          {/* Maintenance Hatch Box */}
          {isMaintenance && (
            <div className="hatch-maintenance hatch-maint p-4 rounded-lg border border-amber-500/40 text-amber-200 text-xs font-mono">
              <span className="font-bold">Maintenance Block:</span> This instrument was reserved for
              scheduled calibration or engineering service.
            </div>
          )}

          {/* Date & Time: Large, bold, tabular display */}
          <div className="p-4 rounded-xl bg-[#060e1d] border border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8]">
                Scheduled Time Range
              </span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#6cd8cb] tabular-nums tracking-tight">
                {formatLabRange(reservation.startAt, reservation.endAt)}
              </div>
              <p className="text-xs font-mono text-[#94a3b8]">
                Lab Local Time ({process.env.APP_TIME_ZONE || "Asia/Colombo"})
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-[#94a3b8] uppercase block">Window</span>
              <span className="font-mono text-sm text-white font-semibold">
                {formatTimeRange(reservation.startAt, reservation.endAt)}
              </span>
            </div>
          </div>

          {/* Resource & Location Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Resource */}
            <div className="p-4 rounded-xl bg-[#18202f] border border-[#334155] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8]">
                Resource
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#060e1d] border border-[#334155] flex items-center justify-center text-[#6cd8cb] shrink-0">
                  <CategoryIcon
                    iconKey={reservation.resource.category.iconKey}
                    className="size-5 shrink-0"
                  />
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/resources/${reservation.resource.id}`}
                    className="font-bold text-white hover:text-[#6cd8cb] text-sm truncate block transition-colors"
                  >
                    {reservation.resource.name}
                  </Link>
                  <span className="text-xs font-mono text-[#94a3b8] block">
                    {reservation.resource.category.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Site & Location */}
            <div className="p-4 rounded-xl bg-[#18202f] border border-[#334155] space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8]">
                Site &amp; Section
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Building className="size-4 text-[#6cd8cb] shrink-0" />
                  <span>{reservation.resource.site.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[#bcc9c6]">
                  <MapPin className="size-3.5 text-[#94a3b8] shrink-0" />
                  <span>{reservation.resource.section.name}</span>
                  {reservation.resource.location ? (
                    <span className="text-[#94a3b8]">({reservation.resource.location})</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Purpose & Attendees */}
          <div className="p-4 rounded-xl bg-[#18202f] border border-[#334155] space-y-3">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8] block mb-1">
                Clinical Purpose / Description
              </span>
              <p className="text-sm font-medium text-white leading-relaxed">
                {reservation.purpose}
              </p>
            </div>

            {reservation.attendeeCount ? (
              <div className="pt-2 border-t border-[#334155]/60 flex items-center gap-2 text-xs font-mono text-[#6cd8cb]">
                <Users className="size-4 shrink-0" />
                <span>Reserved for {reservation.attendeeCount} attendees</span>
              </div>
            ) : null}
          </div>

          {/* Booked By Operator Info */}
          <div className="p-4 rounded-xl bg-[#060e1d] border border-[#334155] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#18202f] border border-[#334155] flex items-center justify-center text-slate-300">
                <User className="size-4" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#94a3b8] block">
                  Booked By
                </span>
                <span className="text-sm font-semibold text-white">
                  {reservation.createdBy.name}
                </span>
                <span className="text-xs font-mono text-[#94a3b8] ml-2">
                  ({reservation.createdBy.role})
                </span>
              </div>
            </div>

            <span className="text-xs font-mono text-[#94a3b8] hidden sm:block">
              {reservation.createdBy.email}
            </span>
          </div>

          {/* Standard Booking Cancellation Action */}
          {!isMaintenance && isCancellable && (
            <div className="pt-4 border-t border-[#334155] flex justify-end">
              <ConfirmAction
                title="Cancel Reservation"
                description={`Are you sure you want to cancel this booking for ${reservation.resource.name}? The slot will immediately be freed for other lab technologists.`}
                confirmLabel="Cancel Reservation"
                isDestructive
                action={cancelBookingAction}
                trigger={
                  <Button
                    variant="outline"
                    className="text-rose-300 hover:text-white bg-rose-950/20 hover:bg-rose-900/40 border-rose-500/40 text-xs font-mono h-9 px-4 active:scale-95 transition-all shadow-xs"
                  >
                    <XCircle className="size-4 mr-2 text-rose-400" />
                    <span>Cancel booking</span>
                  </Button>
                }
              >
                <input type="hidden" name="reservationId" value={reservation.id} />
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="cancelReason" className="text-xs font-mono text-slate-200">
                    Reason for cancellation <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="cancelReason"
                    name="reason"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="e.g. Samples not ready"
                    className="h-9 bg-[#060e1d] border-[#334155] text-xs font-mono text-slate-100"
                  />
                  <p className="text-[10px] font-mono text-slate-400">
                    Required so colleagues and managers understand why the slot was freed.
                  </p>
                </div>
              </ConfirmAction>
            </div>
          )}

          {/* Maintenance Running: End Now */}
          {isRunningMaintenance && canManageMaint && (
            <div className="pt-4 border-t border-[#334155] flex justify-end">
              <ConfirmAction
                title="End Maintenance Block"
                description={`End the maintenance block for ${reservation.resource.name} now? The schedule will be shortened to the next 15-minute slot boundary, freeing the instrument for bookings.`}
                confirmLabel="End now"
                action={endBlockNowAction}
                trigger={
                  <Button
                    variant="outline"
                    className="text-amber-300 hover:text-white bg-amber-950/20 hover:bg-amber-900/40 border-amber-500/40 text-xs font-mono h-9 px-4 active:scale-95 transition-all shadow-xs"
                  >
                    <StopCircle className="size-4 mr-2 text-amber-400" />
                    <span>End now</span>
                  </Button>
                }
              >
                <input type="hidden" name="blockId" value={reservation.id} />
                <input type="hidden" name="resourceId" value={reservation.resource.id} />
              </ConfirmAction>
            </div>
          )}

          {/* Maintenance Future: Cancel Block */}
          {isFutureMaintenance && canManageMaint && (
            <div className="pt-4 border-t border-[#334155] flex justify-end">
              <ConfirmAction
                title="Cancel Maintenance Block"
                description={`Are you sure you want to cancel this future maintenance block for ${reservation.resource.name}? The reserved time will be immediately freed for bookings.`}
                confirmLabel="Cancel block"
                isDestructive
                action={cancelMaintenanceBlockAction}
                trigger={
                  <Button
                    variant="outline"
                    className="text-rose-300 hover:text-white bg-rose-950/20 hover:bg-rose-900/40 border-rose-500/40 text-xs font-mono h-9 px-4 active:scale-95 transition-all shadow-xs"
                  >
                    <XCircle className="size-4 mr-2 text-rose-400" />
                    <span>Cancel block</span>
                  </Button>
                }
              >
                <input type="hidden" name="blockId" value={reservation.id} />
                <input type="hidden" name="resourceId" value={reservation.resource.id} />
                <div className="space-y-1.5 pt-1 text-left">
                  <Label htmlFor="maintCancelReason" className="text-xs font-mono text-slate-200">
                    Reason for cancellation <span className="text-rose-400">*</span>
                  </Label>
                  <Input
                    id="maintCancelReason"
                    name="reason"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="e.g. Service visit rescheduled by engineer"
                    className="h-9 bg-[#060e1d] border-[#334155] text-xs font-mono text-slate-100"
                  />
                </div>
              </ConfirmAction>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
