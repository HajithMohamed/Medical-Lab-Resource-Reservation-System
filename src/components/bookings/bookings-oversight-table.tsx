"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MapPin, Inbox, Eye, CalendarX } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelBookingAction } from "@/actions/bookings";
import type { OversightBookingItem } from "@/services/bookings";

interface BookingsOversightTableProps {
  items: OversightBookingItem[];
  emptyMessage?: string;
  showSiteColumn?: boolean;
}

export function BookingsOversightTable({
  items,
  emptyMessage = "No bookings match these filters.",
  showSiteColumn = false,
}: BookingsOversightTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-card-edge bg-card p-12 text-center shadow-v4">
        <Inbox className="mx-auto size-10 text-muted mb-3" />
        <h3 className="text-sm font-bold text-navy">{emptyMessage}</h3>
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
          Try expanding the date range, changing the status filter, or clearing the site and name
          search.
        </p>
        <div className="mt-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-card-edge bg-card hover:bg-mint text-navy text-xs font-semibold rounded-xl shadow-2xs"
          >
            <Link href="/bookings/manage">Clear filters</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-card-edge bg-card overflow-hidden shadow-v4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-card-edge bg-canvas/80 text-xs font-black uppercase tracking-wider text-navy/90">
              <th className="py-3 px-3.5 whitespace-nowrap">When</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Resource</th>
              {showSiteColumn && <th className="py-3 px-3.5 whitespace-nowrap">Site</th>}
              <th className="py-3 px-3.5 whitespace-nowrap">Booked by</th>
              <th className="py-3 px-3.5">Purpose</th>
              <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
              <th className="py-3 px-3.5 text-right whitespace-nowrap pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-edge text-navy">
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-mint/40 transition-colors">
                {/* When */}
                <td className="py-3 px-3.5 whitespace-nowrap text-navy">
                  <Link
                    href={`/reservations/${b.id}`}
                    className="group block"
                  >
                    <div className="font-bold text-navy group-hover:text-teal text-xs">
                      {b.formattedDate ?? b.formattedRange}
                    </div>
                    {b.formattedTime && (
                      <div className="text-[11.5px] font-semibold text-teal tabular-nums">
                        {b.formattedTime}
                      </div>
                    )}
                  </Link>
                </td>

                {/* Resource */}
                <td className="py-3 px-3.5 whitespace-nowrap">
                  <Link
                    href={`/resources/${b.resource.id}`}
                    className="inline-flex items-center gap-2.5 font-bold text-navy hover:text-teal transition-colors"
                  >
                    <CategoryIcon
                      iconKey={b.resource.category.iconKey}
                      className="size-6 rounded-lg shrink-0"
                    />
                    <div>
                      <span className="truncate max-w-[180px] lg:max-w-[220px] block text-xs">{b.resource.name}</span>
                      {!showSiteColumn && (
                        <span className="text-[11px] text-slate-500 font-medium block">
                          {b.resource.category.name}
                        </span>
                      )}
                    </div>
                  </Link>
                </td>

                {/* Site (only shown if multi-site view) */}
                {showSiteColumn && (
                  <td className="py-3 px-3.5 whitespace-nowrap text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <MapPin className="size-3 text-slate-500 shrink-0" />
                      <span className="truncate max-w-[150px]">{b.resource.site.name}</span>
                    </span>
                  </td>
                )}

                {/* Booked by */}
                <td className="py-3 px-3.5 whitespace-nowrap">
                  <div className="font-bold text-navy text-xs">{b.createdBy.name}</div>
                  <div className="text-[11.5px] text-slate-700 font-medium">{b.createdBy.email}</div>
                </td>

                {/* Purpose */}
                <td className="py-3 px-3.5 max-w-[200px] lg:max-w-[260px]">
                  <p className="truncate text-slate-800 font-medium text-xs" title={b.purpose}>
                    {b.purpose}
                  </p>
                </td>

                {/* Status */}
                <td className="py-3 px-3.5 whitespace-nowrap">
                  {b.status === "CONFIRMED" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-soft text-teal-deep border border-teal-line">
                      <span className="size-1.5 rounded-full bg-teal" />
                      Confirmed
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-soft text-red border border-red/20">
                        <span className="size-1.5 rounded-full bg-red" />
                        Cancelled
                      </span>
                      {b.cancelReason && (
                        <p
                          className="text-[11px] text-red font-semibold max-w-[200px] truncate"
                          title={`Cancelled by ${b.cancelledBy?.name ?? "staff"}. Reason: ${b.cancelReason}`}
                        >
                          Cancelled by {b.cancelledBy?.name ?? "staff"}. Reason: {b.cancelReason}
                        </p>
                      )}
                    </div>
                  )}
                </td>

                {/* Action */}
                <td className="py-3 px-3.5 text-right whitespace-nowrap pr-4">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-xl text-navy hover:text-teal hover:bg-mint border border-card-edge transition-all shadow-2xs"
                      title="View booking details"
                      aria-label="View booking details"
                    >
                      <Link href={`/reservations/${b.id}`}>
                        <Eye className="size-4 text-teal" />
                      </Link>
                    </Button>
                    {b.canCancel && (
                      <ConfirmAction
                        title="Cancel booking"
                        description={`Cancel booking for ${b.resource.name} on ${b.formattedRange}? This will immediately free the slot.`}
                        confirmLabel="Cancel booking"
                        isDestructive
                        trigger={
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8 rounded-xl border border-red/20 text-red bg-red-soft hover:bg-red-soft/80 shadow-2xs"
                            title="Cancel booking"
                            aria-label="Cancel booking"
                          >
                            <CalendarX className="size-4" />
                          </Button>
                        }
                        action={async (formData) => {
                          const res = await cancelBookingAction(formData);
                          if (res.ok) {
                            toast.success("Booking cancelled");
                          }
                          return res;
                        }}
                      >
                        <input type="hidden" name="reservationId" value={b.id} />
                        <div className="space-y-2 py-2">
                          <label
                            htmlFor={`reason-${b.id}`}
                            className="text-xs font-semibold text-navy block"
                          >
                            Cancellation reason <span className="text-red">*</span>
                          </label>
                          <Input
                            id={`reason-${b.id}`}
                            name="reason"
                            required
                            minLength={3}
                            maxLength={200}
                            placeholder="e.g. Schedule adjustment, machine maintenance"
                            className="h-10 bg-card border-card-edge text-navy text-xs rounded-xl focus:border-teal"
                          />
                          <p className="text-[11.5px] text-slate-600 font-medium">
                            This reason will be recorded and shown in the owner&apos;s bookings
                            view.
                          </p>
                        </div>
                      </ConfirmAction>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
