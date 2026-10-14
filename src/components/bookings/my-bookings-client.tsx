"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  CalendarCheck2,
  CalendarX,
  History,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cancelBookingAction } from "@/actions/bookings";
import { BOOKING_NOTICES } from "@/config/booking-notices";
import { NoticeToast } from "@/components/notice-toast";
import { ConfirmAction } from "@/components/confirm-action";
import { CategoryIcon } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { BookingCreateDialog } from "@/components/bookings/booking-create-dialog";
import type { ResourceOption } from "@/components/bookings/booking-create-form";

export interface BookingItem {
  id: string;
  purpose: string;
  startAt: string | Date;
  endAt: string | Date;
  status: string;
  kind: string;
  attendeeCount: number | null;
  cancelReason: string | null;
  cancelledAt: string | Date | null;
  formattedRange?: string;
  cancelledBy?: {
    id: string;
    name: string;
  } | null;
  resource: {
    id: string;
    name: string;
    site: {
      id: string;
      name: string;
    };
    category: {
      name: string;
      iconKey: string;
    };
    section: {
      name: string;
    };
  };
}

interface MyBookingsClientProps {
  currentUserId: string;
  upcoming: BookingItem[];
  past: BookingItem[];
  cancelled: BookingItem[];
  resources?: ResourceOption[];
}

const PAGE_SIZE = 5;

function formatBookingRange(booking: BookingItem): string {
  if (booking.formattedRange) return booking.formattedRange;
  const start = new Date(booking.startAt);
  const end = new Date(booking.endAt);
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  const startDateStr = start.toLocaleDateString("en-GB", dateOptions);
  const startTimeStr = start.toLocaleTimeString("en-GB", timeOptions);
  const endTimeStr = end.toLocaleTimeString("en-GB", timeOptions);
  return `${startDateStr}, ${startTimeStr} to ${endTimeStr}`;
}

function ClientPagination({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  itemLabel,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (totalCount === 0 || totalPages <= 1) return null;
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="p-3 bg-[#18202f] border border-[#334155] rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#94a3b8] mt-2">
      <div>
        Showing{" "}
        <strong className="text-white font-semibold">
          {start}-{end}
        </strong>{" "}
        of <strong className="text-white font-semibold">{totalCount}</strong> {itemLabel}
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#dbe2f8] hover:bg-[#222a3a] hover:text-white disabled:text-[#879390] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          <span>Previous</span>
        </button>
        <span className="px-2 text-[#6cd8cb] font-semibold">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#141c2b] border border-[#334155]/60 text-[#dbe2f8] hover:bg-[#222a3a] hover:text-white disabled:text-[#879390] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function MyBookingsClient({
  currentUserId,
  upcoming,
  past,
  cancelled,
  resources,
}: MyBookingsClientProps) {
  // simple polling: works on any host, no socket server needed
  useAutoRefresh();

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  // Soft fade highlight effect for newly booked reservation
  const [dismissedHighlight, setDismissedHighlight] = React.useState<string | null>(null);
  const activeHighlight = highlightId && dismissedHighlight !== highlightId ? highlightId : null;

  React.useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        setDismissedHighlight(highlightId);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightId]);

  // Client pagination states
  const [upcomingPage, setUpcomingPage] = React.useState(1);
  const [pastPage, setPastPage] = React.useState(1);
  const [cancelledPage, setCancelledPage] = React.useState(1);

  const upcomingTotalPages = Math.ceil(upcoming.length / PAGE_SIZE) || 1;
  const paginatedUpcoming = upcoming.slice(
    (upcomingPage - 1) * PAGE_SIZE,
    upcomingPage * PAGE_SIZE,
  );

  const pastTotalPages = Math.ceil(past.length / PAGE_SIZE) || 1;
  const paginatedPast = past.slice((pastPage - 1) * PAGE_SIZE, pastPage * PAGE_SIZE);

  const cancelledTotalPages = Math.ceil(cancelled.length / PAGE_SIZE) || 1;
  const paginatedCancelled = cancelled.slice(
    (cancelledPage - 1) * PAGE_SIZE,
    cancelledPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-8">
      {/* Toast notifications */}
      <NoticeToast notices={BOOKING_NOTICES} />

      {/* 1. UPCOMING SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#334155] pb-2">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="size-4 text-[#6cd8cb]" />
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-white">
              Upcoming
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#18202f] text-[#6cd8cb] border border-[#334155]">
              {upcoming.length}
            </span>
          </div>

          {resources && resources.length > 0 && (
            <BookingCreateDialog
              resources={resources}
              trigger={
                <Button
                  size="sm"
                  className="h-7 text-xs font-mono bg-[#6cd8cb]/15 hover:bg-[#6cd8cb] text-[#6cd8cb] hover:text-[#003732] border border-[#6cd8cb]/30 transition-all active:scale-95 sm:hidden"
                >
                  <Plus className="size-3 stroke-[2.5]" />
                  <span>Book</span>
                </Button>
              }
            />
          )}
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No upcoming bookings."
            description="Find a free slot in the calendar to schedule instrument runs or room reservations."
            action={
              <Button
                asChild
                size="sm"
                className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono"
              >
                <Link href="/calendar">Find a free slot</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {paginatedUpcoming.map((booking) => {
              const start = new Date(booking.startAt);
              const now = new Date();
              const hasStarted = start.getTime() <= now.getTime();
              const isHighlighted = activeHighlight === booking.id;
              const rangeDisplay = formatBookingRange(booking);

              return (
                <div
                  key={booking.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-xl border bg-[#141c2b] transition-all duration-700 ${
                    isHighlighted
                      ? "border-[#6cd8cb] bg-[#6cd8cb]/10 ring-1 ring-[#6cd8cb]/30 shadow-md"
                      : "border-[#334155] hover:border-[#334155]/90 hover:bg-[#18202f]"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#060e1d] border border-[#334155] flex items-center justify-center text-[#6cd8cb] shrink-0">
                      <CategoryIcon
                        iconKey={booking.resource.category.iconKey}
                        className="size-5 shrink-0"
                      />
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Date and Time: ONLY this text is the link to /reservations/[id] */}
                        <Link
                          href={`/reservations/${booking.id}`}
                          className="font-bold font-mono text-sm text-[#6cd8cb] hover:underline tabular-nums"
                        >
                          {rangeDisplay}
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#94a3b8]">
                        <span className="font-semibold text-white truncate">
                          {booking.resource.name}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[11px] font-mono">
                          <MapPin className="size-3 text-[#94a3b8]" />
                          {booking.resource.site.name}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] font-mono text-[#bcc9c6]">
                          {booking.resource.section.name}
                        </span>
                      </div>

                      <p className="text-xs text-[#dbe2f8] font-mono truncate">
                        Purpose: <span className="text-slate-300">{booking.purpose}</span>
                        {booking.attendeeCount ? (
                          <span className="text-[#94a3b8]">
                            {" "}
                            • {booking.attendeeCount} attendees
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {!hasStarted && (
                      <ConfirmAction
                        title="Cancel Booking"
                        description={`Cancel booking for ${booking.resource.name} on ${rangeDisplay}? This will free the slot for other staff.`}
                        confirmLabel="Cancel Booking"
                        isDestructive
                        action={async (formData) => {
                          const res = await cancelBookingAction(formData);
                          if (res.ok) {
                            toast.success("Booking cancelled");
                          }
                          return res;
                        }}
                        trigger={
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-xs font-mono text-rose-300 hover:text-white bg-rose-950/20 hover:bg-rose-900/40 border-rose-500/40 active:scale-95 transition-all"
                          >
                            Cancel booking
                          </Button>
                        }
                      >
                        <input type="hidden" name="reservationId" value={booking.id} />
                        <div className="space-y-1.5 pt-1">
                          <Label
                            htmlFor="cancelReason"
                            className="text-xs font-mono text-slate-200"
                          >
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
                    )}
                  </div>
                </div>
              );
            })}

            <ClientPagination
              currentPage={upcomingPage}
              totalPages={upcomingTotalPages}
              totalCount={upcoming.length}
              pageSize={PAGE_SIZE}
              itemLabel="upcoming reservations"
              onPageChange={setUpcomingPage}
            />
          </div>
        )}
      </section>

      {/* 2. PAST 30 DAYS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#334155] pb-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-[#94a3b8]" />
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-[#94a3b8]">
              Past 30 days
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#18202f] text-[#94a3b8] border border-[#334155]">
              {past.length}
            </span>
          </div>
        </div>

        {past.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[#334155] bg-[#060e1d]/40 text-center">
            <p className="text-xs font-mono text-[#94a3b8]">
              No completed bookings in the last 30 days.
            </p>
          </div>
        ) : (
          <div className="space-y-2 opacity-85 hover:opacity-100 transition-opacity">
            {paginatedPast.map((booking) => {
              const rangeDisplay = formatBookingRange(booking);

              return (
                <div
                  key={booking.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-[#334155]/60 bg-[#141c2b] text-slate-300 hover:bg-[#18202f] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#060e1d] border border-[#334155] flex items-center justify-center text-[#94a3b8] shrink-0">
                      <CategoryIcon
                        iconKey={booking.resource.category.iconKey}
                        className="size-4 shrink-0 text-[#94a3b8]"
                      />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <Link
                        href={`/reservations/${booking.id}`}
                        className="font-bold font-mono text-xs text-white hover:text-[#6cd8cb] tabular-nums"
                      >
                        {rangeDisplay}
                      </Link>
                      <div className="text-[11px] font-mono text-[#94a3b8] truncate">
                        {booking.resource.name} • {booking.resource.site.name} • {booking.purpose}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <ClientPagination
              currentPage={pastPage}
              totalPages={pastTotalPages}
              totalCount={past.length}
              pageSize={PAGE_SIZE}
              itemLabel="past reservations"
              onPageChange={setPastPage}
            />
          </div>
        )}
      </section>

      {/* 3. CANCELLED IN THE LAST 30 DAYS SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-[#334155] pb-2">
          <div className="flex items-center gap-2">
            <CalendarX className="size-4 text-rose-400" />
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-rose-300">
              Cancelled in the last 30 days
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#18202f] text-rose-400 border border-rose-500/30">
              {cancelled.length}
            </span>
          </div>
        </div>

        {cancelled.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-[#334155] bg-[#060e1d]/40 text-center">
            <p className="text-xs font-mono text-[#94a3b8]">
              No cancellations in the last 30 days.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {paginatedCancelled.map((booking) => {
              const rangeDisplay = formatBookingRange(booking);
              const isCancelledByOther =
                booking.cancelledBy && booking.cancelledBy.id !== currentUserId;

              return (
                <div
                  key={booking.id}
                  className={`p-3.5 rounded-xl border border-[#334155] bg-[#141c2b] border-l-4 border-l-rose-500 space-y-1.5 ${
                    isCancelledByOther ? "bg-rose-950/20" : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Link
                        href={`/reservations/${booking.id}`}
                        className="font-bold font-mono text-xs text-rose-300 hover:underline tabular-nums"
                      >
                        {rangeDisplay}
                      </Link>
                      <span className="text-xs text-[#94a3b8] truncate font-medium">
                        {booking.resource.name} ({booking.resource.site.name})
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/40 shrink-0 self-start sm:self-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Cancelled
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-mono">
                    Purpose: <span className="text-[#94a3b8]">{booking.purpose}</span>
                  </p>

                  {/* Cancelled by line: highlighted when cancelled by someone else */}
                  <div
                    className={`text-xs font-mono p-2.5 rounded-lg ${
                      isCancelledByOther
                        ? "bg-rose-950/40 text-rose-200 border border-rose-500/30 font-semibold"
                        : "bg-[#060e1d] text-[#94a3b8] border border-[#334155]/60"
                    }`}
                  >
                    Cancelled by{" "}
                    <span className="text-white font-medium">
                      {booking.cancelledBy?.name ?? "a manager"}
                    </span>
                    . Reason:{" "}
                    <span className="italic">{booking.cancelReason ?? "No reason given."}</span>
                  </div>
                </div>
              );
            })}

            <ClientPagination
              currentPage={cancelledPage}
              totalPages={cancelledTotalPages}
              totalCount={cancelled.length}
              pageSize={PAGE_SIZE}
              itemLabel="cancelled reservations"
              onPageChange={setCancelledPage}
            />
          </div>
        )}
      </section>
    </div>
  );
}
