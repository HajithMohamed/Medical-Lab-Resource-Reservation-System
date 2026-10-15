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
}

export function BookingsOversightTable({
  items,
  emptyMessage = "No bookings match these filters.",
}: BookingsOversightTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#334155] bg-[#141c2b] p-12 text-center">
        <Inbox className="mx-auto size-10 text-slate-500 mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">{emptyMessage}</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Try expanding the date range, changing the status filter, or clearing the site and name
          search.
        </p>
        <div className="mt-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-[#334155] text-xs font-mono"
          >
            <Link href="/bookings/manage">Clear filters</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#334155] bg-[#141c2b] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#334155] bg-[#18202f]/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">When</th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Resource</th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Site</th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Booked by</th>
              <th className="py-2.5 px-3 font-semibold">Purpose</th>
              <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Status</th>
              <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60 text-slate-300">
            {items.map((b) => (
              <tr key={b.id} className="hover:bg-[#18202f]/50 transition-colors">
                {/* When */}
                <td className="py-2 px-3 font-mono font-medium whitespace-nowrap text-slate-200">
                  <Link
                    href={`/reservations/${b.id}`}
                    className="text-[#6cd8cb] hover:underline font-bold tabular-nums"
                  >
                    {b.formattedRange}
                  </Link>
                </td>

                {/* Resource */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <Link
                    href={`/resources/${b.resource.id}`}
                    className="inline-flex items-center gap-2 font-medium text-slate-100 hover:text-[#6cd8cb] transition-colors"
                  >
                    <CategoryIcon
                      iconKey={b.resource.category.iconKey}
                      className="size-5 rounded shrink-0"
                    />
                    <span className="truncate max-w-[200px]">{b.resource.name}</span>
                  </Link>
                </td>

                {/* Site */}
                <td className="py-2 px-3 whitespace-nowrap font-mono text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3 text-slate-500" />
                    <span>{b.resource.site.name}</span>
                  </span>
                </td>

                {/* Booked by */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <div className="font-medium text-slate-200">{b.createdBy.name}</div>
                  <div className="font-mono text-[11px] text-slate-400">{b.createdBy.email}</div>
                </td>

                {/* Purpose */}
                <td className="py-2 px-3 max-w-[240px]">
                  <p className="truncate text-slate-300" title={b.purpose}>
                    {b.purpose}
                  </p>
                </td>

                {/* Status */}
                <td className="py-2 px-3 whitespace-nowrap">
                  {b.status === "CONFIRMED" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Confirmed
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/30">
                        <span className="size-1.5 rounded-full bg-rose-400" />
                        Cancelled
                      </span>
                      {b.cancelReason && (
                        <p
                          className="text-[11px] text-rose-300/80 font-mono max-w-[200px] truncate"
                          title={`Cancelled by ${b.cancelledBy?.name ?? "staff"}. Reason: ${b.cancelReason}`}
                        >
                          Cancelled by {b.cancelledBy?.name ?? "staff"}. Reason: {b.cancelReason}
                        </p>
                      )}
                    </div>
                  )}
                </td>

                {/* Action */}
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-1 justify-end">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-md text-[#94a3b8] hover:text-white hover:bg-[#18202f] border border-transparent hover:border-[#334155] transition-all"
                      title="View booking details"
                      aria-label="View booking details"
                    >
                      <Link href={`/reservations/${b.id}`}>
                        <Eye className="size-4" />
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
                            className="size-9 rounded-md border-rose-500/40 text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 hover:text-rose-300"
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
                            className="text-xs font-semibold text-slate-200 block"
                          >
                            Cancellation reason <span className="text-rose-400">*</span>
                          </label>
                          <Input
                            id={`reason-${b.id}`}
                            name="reason"
                            required
                            minLength={3}
                            maxLength={200}
                            placeholder="e.g. Schedule adjustment, machine maintenance"
                            className="bg-[#0b1322] border-[#334155] text-xs text-slate-100"
                          />
                          <p className="text-[11px] text-slate-400">
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
