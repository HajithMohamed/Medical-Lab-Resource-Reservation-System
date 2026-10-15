"use client";

import * as React from "react";
import Link from "next/link";
import { Wrench, StopCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { endBlockNowAction, cancelMaintenanceBlockAction } from "@/actions/maintenance";
import type { MaintenanceBlockItem } from "@/services/maintenance";

export interface MaintenanceTableProps {
  blocks: MaintenanceBlockItem[];
  canManageAny?: boolean;
  isAdmin?: boolean;
}

export function MaintenanceTable({ blocks, isAdmin = false }: MaintenanceTableProps) {
  if (blocks.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No time is blocked."
        description="No maintenance blocks found for the selected view and filter."
        action={
          <Button
            asChild
            size="sm"
            className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono"
          >
            <Link href="/maintenance/new">
              <Wrench className="size-3.5 mr-1.5" />
              <span>Block time</span>
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-[#334155] bg-[#141c2b] overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#334155] bg-[#060e1d] text-[#879390] uppercase font-mono tracking-wider text-[11px]">
              <th className="py-3 px-4 font-semibold w-12 text-center">Type</th>
              <th className="py-3 px-4 font-semibold">Resource</th>
              {isAdmin && <th className="py-3 px-4 font-semibold">Site</th>}
              <th className="py-3 px-4 font-semibold">Schedule</th>
              <th className="py-3 px-4 font-semibold">Reason</th>
              <th className="py-3 px-4 font-semibold">Created By</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60 font-mono">
            {blocks.map((block) => (
              <tr key={block.id} className="hover:bg-[#18202f]/50 transition-colors">
                {/* Hatch Swatch */}
                <td className="py-3 px-4 text-center">
                  <div
                    title="Maintenance"
                    className="size-5 rounded border border-amber-500/50 bg-amber-500/20 hatch-maint inline-block shadow-2xs"
                  />
                </td>

                {/* Resource */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon iconKey={block.iconKey} className="size-6 shrink-0 rounded" />
                    <div className="min-w-0">
                      <Link
                        href={`/resources/${block.resourceId}`}
                        className="font-bold text-white hover:text-[#6cd8cb] transition-colors truncate block"
                      >
                        {block.resourceName}
                      </Link>
                      <span className="text-[11px] text-[#879390] block truncate">
                        {block.categoryName}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Site (admin only) */}
                {isAdmin && (
                  <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
                    {block.siteName}
                  </td>
                )}

                {/* Schedule */}
                <td className="py-3 px-4 tabular-nums text-white whitespace-nowrap">
                  <div>{block.rangeFormatted}</div>
                  {block.isRunning && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30 mt-0.5">
                      <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Running now
                    </span>
                  )}
                </td>

                {/* Reason */}
                <td className="py-3 px-4 text-slate-200 max-w-xs break-words">
                  <Link
                    href={`/reservations/${block.id}`}
                    className="hover:text-[#6cd8cb] transition-colors line-clamp-2"
                  >
                    {block.purpose}
                  </Link>
                </td>

                {/* Created By */}
                <td className="py-3 px-4 text-[#879390] whitespace-nowrap">
                  {block.createdByName}
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    {block.isRunning && (
                      <ConfirmAction
                        title="End Maintenance Block"
                        description={`End the maintenance block for ${block.resourceName} now? The schedule will be shortened to the next 15-minute slot boundary, freeing the instrument for bookings.`}
                        confirmLabel="End now"
                        action={async (formData) => {
                          await endBlockNowAction(formData);
                          toast.success("Block ended");
                        }}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-mono border-amber-500/40 text-amber-300 bg-amber-950/20 hover:bg-amber-900/40"
                          >
                            <StopCircle className="size-3 mr-1 text-amber-400" />
                            <span>End now</span>
                          </Button>
                        }
                      >
                        <input type="hidden" name="blockId" value={block.id} />
                        <input type="hidden" name="resourceId" value={block.resourceId} />
                      </ConfirmAction>
                    )}

                    {block.isFuture && (
                      <ConfirmAction
                        title="Cancel Future Maintenance"
                        description={`Are you sure you want to cancel this future maintenance block for ${block.resourceName}? The reserved time will be immediately freed for user bookings.`}
                        confirmLabel="Cancel block"
                        isDestructive
                        action={async (formData) => {
                          await cancelMaintenanceBlockAction(formData);
                          toast.success("Block cancelled");
                        }}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-mono border-rose-500/40 text-rose-300 bg-rose-950/20 hover:bg-rose-900/40"
                          >
                            <XCircle className="size-3 mr-1 text-rose-400" />
                            <span>Cancel</span>
                          </Button>
                        }
                      >
                        <input type="hidden" name="blockId" value={block.id} />
                        <input type="hidden" name="resourceId" value={block.resourceId} />
                        <div className="space-y-1.5 pt-1 text-left">
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
                            placeholder="e.g. Technician visit rescheduled"
                            className="h-9 bg-[#060e1d] border-[#334155] text-xs font-mono text-slate-100"
                          />
                        </div>
                      </ConfirmAction>
                    )}

                    {!block.isRunning && !block.isFuture && (
                      <span className="text-[11px] text-[#879390] italic">Past</span>
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
