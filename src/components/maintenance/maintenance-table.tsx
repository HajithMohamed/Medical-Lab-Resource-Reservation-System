"use client";

import * as React from "react";
import Link from "next/link";
import { Wrench, StopCircle, XCircle, Eye } from "lucide-react";
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
    <div className="rounded-2xl border border-card-edge bg-card overflow-hidden shadow-v4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-card-edge bg-canvas/80 text-muted uppercase font-bold text-[11px]">
              <th className="py-2.5 px-3 font-semibold w-12 text-center">Type</th>
              <th className="py-2.5 px-3 font-semibold">Resource</th>
              {isAdmin && <th className="py-2.5 px-3 font-semibold">Site</th>}
              <th className="py-2.5 px-3 font-semibold">Schedule</th>
              <th className="py-2.5 px-3 font-semibold">Reason</th>
              <th className="py-2.5 px-3 font-semibold">Created By</th>
              <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-edge">
            {blocks.map((block) => (
              <tr key={block.id} className="hover:bg-mint/40 transition-colors">
                {/* Hatch Swatch */}
                <td className="py-2.5 px-3 text-center">
                  <div
                    title="Maintenance"
                    className="size-5 rounded-md border border-amber/40 bg-amber-soft inline-block shadow-2xs"
                  />
                </td>

                {/* Resource */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon iconKey={block.iconKey} className="size-6 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <Link
                        href={`/resources/${block.resourceId}`}
                        className="font-bold text-navy hover:text-teal transition-colors truncate block"
                      >
                        {block.resourceName}
                      </Link>
                      <span className="text-[11px] text-muted block truncate">
                        {block.categoryName}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Site (admin only) */}
                {isAdmin && (
                  <td className="py-2.5 px-3 text-muted font-medium whitespace-nowrap">
                    {block.siteName}
                  </td>
                )}

                {/* Schedule */}
                <td className="py-2.5 px-3 tabular-nums text-navy font-semibold whitespace-nowrap">
                  <div>{block.rangeFormatted}</div>
                  {block.isRunning && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-strong font-bold bg-amber-soft px-1.5 py-0.2 rounded border border-amber/30 mt-0.5">
                      <span className="size-1.5 rounded-full bg-amber-strong animate-pulse" />
                      Running now
                    </span>
                  )}
                </td>

                {/* Reason */}
                <td className="py-2.5 px-3 text-navy max-w-xs break-words">
                  <Link
                    href={`/reservations/${block.id}`}
                    className="hover:text-teal transition-colors line-clamp-2"
                  >
                    {block.purpose}
                  </Link>
                </td>

                {/* Created By */}
                <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                  {block.createdByName}
                </td>

                {/* Actions */}
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-xl text-muted hover:text-navy hover:bg-mint border border-card-edge transition-all shadow-2xs"
                      title="View block details"
                      aria-label={`View block details for ${block.resourceName}`}
                    >
                      <Link href={`/reservations/${block.id}`}>
                        <Eye className="size-4 text-teal" />
                      </Link>
                    </Button>

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
                            size="icon"
                            className="size-8 rounded-xl border border-amber/30 text-amber-strong bg-amber-soft hover:bg-amber-soft/80 shadow-2xs"
                            title="End maintenance now"
                            aria-label="End maintenance now"
                          >
                            <StopCircle className="size-4 text-amber-strong" />
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
                            size="icon"
                            className="size-8 rounded-xl border border-red/20 text-red bg-red-soft hover:bg-red-soft/80 shadow-2xs"
                            title="Cancel maintenance block"
                            aria-label="Cancel maintenance block"
                          >
                            <XCircle className="size-4 text-red" />
                          </Button>
                        }
                      >
                        <input type="hidden" name="blockId" value={block.id} />
                        <input type="hidden" name="resourceId" value={block.resourceId} />
                        <div className="space-y-1.5 pt-1 text-left">
                          <Label
                            htmlFor="cancelReason"
                            className="text-xs font-semibold text-navy"
                          >
                            Reason for cancellation <span className="text-red">*</span>
                          </Label>
                          <Input
                            id="cancelReason"
                            name="reason"
                            required
                            minLength={3}
                            maxLength={200}
                            placeholder="e.g. Technician visit rescheduled"
                            className="h-10 bg-card border-card-edge text-xs text-navy rounded-xl focus:border-teal"
                          />
                        </div>
                      </ConfirmAction>
                    )}

                    {!block.isRunning && !block.isFuture && (
                      <span className="text-[11px] text-muted italic">Past</span>
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
