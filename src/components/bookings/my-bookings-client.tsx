"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  CalendarX,
  Eye,
  CalendarSearch,
  Bell,
  ChevronLeft,
  ChevronRight,
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
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { cn } from "@/lib/utils";
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

const PAGE_SIZE = 6;

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
  return `${startDateStr} · ${startTimeStr}–${endTimeStr}`;
}

function getDayPill(startAt: string | Date) {
  const date = new Date(startAt);
  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return { label: "TODAY", isToday: true };
  }
  return {
    label: date.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase(),
    isToday: false,
  };
}

function PaginationBar({
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
    <div className="p-3.5 bg-card border border-card-edge rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted shadow-v4 mt-3">
      <div>
        Showing{" "}
        <strong className="text-navy font-bold">
          {start}–{end}
        </strong>{" "}
        of <strong className="text-navy font-bold">{totalCount}</strong> {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-card-edge bg-canvas hover:bg-line text-navy font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          <span>Previous</span>
        </button>
        <span className="px-2 text-teal font-bold">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-card-edge bg-canvas hover:bg-line text-navy font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
}: MyBookingsClientProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  // Tab state: "upcoming" | "past" | "cancelled"
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "past" | "cancelled">("upcoming");

  // Client pagination
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

  // Check if any recent booking was cancelled by someone else (Manager/Admin or maintenance)
  const thirdPartyCancelled = cancelled.find(
    (b) => b.cancelledBy && b.cancelledBy.id !== currentUserId,
  );

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      <NoticeToast notices={BOOKING_NOTICES} />

      {/* 1. TABS: Upcoming, Past, Cancelled with count badges */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border",
            activeTab === "upcoming"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Upcoming</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold",
              activeTab === "upcoming"
                ? "bg-white text-teal-deep shadow-2xs"
                : "bg-canvas text-muted",
            )}
          >
            {upcoming.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("past")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border",
            activeTab === "past"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Past</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold",
              activeTab === "past" ? "bg-white text-teal-deep shadow-2xs" : "bg-canvas text-muted",
            )}
          >
            {past.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cancelled")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border",
            activeTab === "cancelled"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Cancelled</span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold",
              activeTab === "cancelled"
                ? "bg-white text-teal-deep shadow-2xs"
                : "bg-canvas text-muted",
            )}
          >
            {cancelled.length}
          </span>
        </button>
      </div>

      {/* 2. NOTICE CARD: Shown when a booking was cancelled by someone else */}
      {thirdPartyCancelled && (
        <div className="rounded-2xl border border-amber-line bg-amber-soft p-4 shadow-v4 flex items-start gap-3.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-soft border border-amber-line text-amber-strong">
            <Bell className="size-4" />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="font-extrabold text-sm text-amber leading-tight">
              A booking was cancelled
            </h3>
            <p className="text-xs font-medium text-amber/90">
              {thirdPartyCancelled.resource.name} · {formatBookingRange(thirdPartyCancelled)}
              {thirdPartyCancelled.cancelReason && ` (${thirdPartyCancelled.cancelReason})`}
            </p>
            <div className="pt-2">
              <Link
                href={`/book?resourceId=${thirdPartyCancelled.resource.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-line bg-mint text-teal font-bold text-xs hover:bg-teal-soft transition-colors"
              >
                <span>Find an alternative slot</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB PANELS */}
      {/* 3A. UPCOMING TAB */}
      {activeTab === "upcoming" && (
        <div>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming bookings."
              description="Find a free slot in the calendar to schedule instrument runs or room reservations."
              action={
                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-xs"
                >
                  <Link href="/calendar">Find a free slot</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paginatedUpcoming.map((booking) => {
                  const start = new Date(booking.startAt);
                  const now = new Date();
                  const hasStarted = start.getTime() <= now.getTime();
                  const isHighlighted = highlightId === booking.id;
                  const rangeDisplay = formatBookingRange(booking);
                  const dayPill = getDayPill(booking.startAt);

                  return (
                    <div
                      key={booking.id}
                      className={cn(
                        "rounded-[20px] bg-card border p-4 sm:p-5 shadow-v4 flex flex-col justify-between gap-4 transition-all",
                        isHighlighted
                          ? "border-teal ring-2 ring-teal/20"
                          : "border-card-edge hover:border-line",
                      )}
                    >
                      {/* Top row: Icon tile + Name + Pill */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal">
                            <CategoryIcon
                              iconKey={booking.resource.category.iconKey}
                              className="size-5 shrink-0"
                            />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="font-extrabold text-sm sm:text-base text-navy truncate">
                              {booking.resource.name}
                            </h3>
                            <p className="text-xs text-muted truncate">
                              {booking.purpose} · {booking.resource.section.name}
                            </p>
                          </div>
                        </div>

                        {/* Date badge */}
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide uppercase",
                            dayPill.isToday
                              ? "bg-teal-soft text-teal-deep border border-teal-line"
                              : "bg-canvas text-muted border border-line",
                          )}
                        >
                          {dayPill.label}
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-line" />

                      {/* Time line */}
                      <div className="flex items-center gap-2 text-xs font-bold text-navy">
                        <CalendarDays className="size-4 text-muted shrink-0" />
                        <span className="tabular-nums">{rangeDisplay}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Link
                          href={`/reservations/${booking.id}`}
                          className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-card-edge bg-card hover:bg-canvas font-bold text-xs text-navy transition-colors"
                        >
                          <Eye className="size-3.5" />
                          <span>View</span>
                        </Link>

                        {!hasStarted ? (
                          <ConfirmAction
                            title="Cancel booking?"
                            description={`Cancel booking for ${booking.resource.name} on ${rangeDisplay}? This will free the slot for other team members.`}
                            confirmLabel="Cancel booking"
                            isDestructive
                            action={async (formData) => {
                              const res = await cancelBookingAction(formData);
                              if (res.ok) {
                                toast.success("Booking cancelled");
                              }
                              return res;
                            }}
                            trigger={
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-xl border border-red/30 bg-red-soft hover:bg-red/10 font-bold text-xs text-red transition-colors"
                              >
                                <CalendarX className="size-3.5" />
                                <span>Cancel</span>
                              </button>
                            }
                          >
                            <input type="hidden" name="reservationId" value={booking.id} />
                            <div className="space-y-1.5 pt-2">
                              <Label htmlFor="cancelReason" className="text-xs font-bold text-navy">
                                Reason for cancellation <span className="text-red">*</span>
                              </Label>
                              <Input
                                id="cancelReason"
                                name="reason"
                                required
                                minLength={3}
                                maxLength={200}
                                placeholder="e.g. Protocol change, sample delayed"
                                className="h-10 bg-canvas border-card-edge text-xs font-medium text-navy"
                              />
                            </div>
                          </ConfirmAction>
                        ) : (
                          <span className="inline-flex items-center justify-center h-10 px-3 rounded-xl bg-canvas text-xs font-medium text-muted">
                            In progress
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationBar
                currentPage={upcomingPage}
                totalPages={upcomingTotalPages}
                totalCount={upcoming.length}
                pageSize={PAGE_SIZE}
                itemLabel="upcoming reservations"
                onPageChange={setUpcomingPage}
              />
            </>
          )}
        </div>
      )}

      {/* 3B. PAST TAB */}
      {activeTab === "past" && (
        <div>
          {past.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No past bookings"
              description="Completed reservations from the last 30 days will appear here."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paginatedPast.map((booking) => {
                  const rangeDisplay = formatBookingRange(booking);

                  return (
                    <div
                      key={booking.id}
                      className="rounded-[20px] bg-card border border-card-edge p-4 sm:p-5 shadow-v4 flex flex-col justify-between gap-3 opacity-90 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-muted">
                            <CategoryIcon
                              iconKey={booking.resource.category.iconKey}
                              className="size-4 shrink-0"
                            />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="font-extrabold text-sm text-navy truncate">
                              {booking.resource.name}
                            </h3>
                            <p className="text-xs text-muted truncate">
                              {booking.purpose} · {booking.resource.section.name}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold bg-canvas text-muted border border-line">
                          COMPLETED
                        </span>
                      </div>

                      <div className="border-t border-line" />

                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="tabular-nums font-semibold text-navy">{rangeDisplay}</span>
                        <Link
                          href={`/reservations/${booking.id}`}
                          className="font-bold text-teal hover:underline inline-flex items-center gap-1"
                        >
                          <span>View record</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationBar
                currentPage={pastPage}
                totalPages={pastTotalPages}
                totalCount={past.length}
                pageSize={PAGE_SIZE}
                itemLabel="past reservations"
                onPageChange={setPastPage}
              />
            </>
          )}
        </div>
      )}

      {/* 3C. CANCELLED TAB */}
      {activeTab === "cancelled" && (
        <div>
          {cancelled.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="No cancelled bookings"
              description="Any cancelled bookings in the last 30 days will show here."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paginatedCancelled.map((booking) => {
                  const rangeDisplay = formatBookingRange(booking);

                  return (
                    <div
                      key={booking.id}
                      className="rounded-[20px] bg-card border border-card-edge p-4 sm:p-5 shadow-v4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-soft text-red">
                            <CalendarX className="size-4 shrink-0" />
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <h3 className="font-extrabold text-sm text-navy truncate">
                              {booking.resource.name}
                            </h3>
                            <p className="text-xs text-muted truncate">
                              {booking.purpose} · {booking.resource.section.name}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-red-soft text-red border border-red/20">
                          CANCELLED
                        </span>
                      </div>

                      {booking.cancelReason && (
                        <div className="rounded-xl bg-canvas p-2.5 text-xs text-muted">
                          <span className="font-bold text-navy">Reason: </span>
                          <span>{booking.cancelReason}</span>
                          {booking.cancelledBy && (
                            <span className="text-[11px] block mt-0.5 text-faint">
                              by {booking.cancelledBy.name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="border-t border-line" />

                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="tabular-nums font-semibold text-navy">{rangeDisplay}</span>
                        <Link
                          href={`/reservations/${booking.id}`}
                          className="font-bold text-teal hover:underline inline-flex items-center gap-1"
                        >
                          <span>Details</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationBar
                currentPage={cancelledPage}
                totalPages={cancelledTotalPages}
                totalCount={cancelled.length}
                pageSize={PAGE_SIZE}
                itemLabel="cancelled reservations"
                onPageChange={setCancelledPage}
              />
            </>
          )}
        </div>
      )}

      {/* 4. MOBILE STICKY ACTION BAR (< 768px): "Find a slot" button */}
      <div className="md:hidden">
        <StickyActionBar>
          <Link
            href="/book"
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-sm shadow-md active:scale-[0.98] transition-transform"
          >
            <CalendarSearch className="size-4" />
            <span>Find a slot</span>
          </Link>
        </StickyActionBar>
      </div>
    </div>
  );
}
