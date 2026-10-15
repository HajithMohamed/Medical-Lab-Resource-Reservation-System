"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Bell, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { formatClientLabDate, formatClientLabTime } from "@/lib/client-time";
import { cancelWatchAction } from "@/actions/notifications";
import { toast } from "sonner";
import type { WatchItem } from "@/services/watches";

export interface AlertsListProps {
  watches: WatchItem[];
}

export function AlertsList({ watches: initialWatches }: AlertsListProps) {
  const router = useRouter();
  const [cancelledIds, setCancelledIds] = React.useState<Set<string>>(() => new Set());
  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const watches = initialWatches.map((w) =>
    cancelledIds.has(w.id) ? { ...w, status: "CANCELLED" as const } : w,
  );

  const handleCancel = async (watchId: string) => {
    setCancellingId(watchId);
    try {
      const result = await cancelWatchAction(watchId);
      if (result.ok) {
        toast.success("Alert cancelled.");
        setCancelledIds((prev) => new Set(prev).add(watchId));
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to cancel alert.");
      }
    } catch {
      toast.error("Failed to cancel alert.");
    } finally {
      setCancellingId(null);
    }
  };

  if (watches.length === 0) {
    return (
      <EmptyState
        icon={Eye}
        title="No resource alerts"
        description="When you find a busy instrument or one that's out of service, click 'Notify me when it's free' to be alerted the moment it becomes available."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-[#94a3b8] px-1">
        Showing {watches.length} alert{watches.length === 1 ? "" : "s"}
      </div>

      <div className="divide-y divide-[#334155]/60 border border-[#334155] rounded-xl overflow-hidden bg-[#141c2b]">
        {watches.map((watch) => {
          const isActive = watch.status === "ACTIVE";
          const isSent = watch.status === "SENT";
          const isExpired = watch.status === "EXPIRED";

          let statusBadgeClass = "bg-[#334155]/40 text-[#94a3b8] border-[#334155]";
          if (isActive) {
            statusBadgeClass = "bg-[#6cd8cb]/15 text-[#6cd8cb] border-[#6cd8cb]/30";
          } else if (isSent) {
            statusBadgeClass = "bg-blue-500/15 text-blue-400 border-blue-500/30";
          } else if (isExpired) {
            statusBadgeClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";
          }

          return (
            <div
              key={watch.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#1a2335] transition-colors"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-white text-sm tracking-tight">
                    {watch.resource.name}
                  </span>
                  <span className="text-xs text-[#94a3b8]">({watch.resource.site.name})</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusBadgeClass}`}
                  >
                    {watch.status}
                  </span>
                </div>

                <div className="text-xs text-[#94a3b8] space-y-1">
                  {watch.kind === "BACK_IN_SERVICE" ? (
                    <div className="flex items-center gap-1.5 text-[#cbd5e1]">
                      <Bell className="size-3.5 text-[#6cd8cb]" />
                      <span>Alert when back in service</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap text-[#cbd5e1]">
                      <Clock className="size-3.5 text-[#6cd8cb]" />
                      <span>
                        Wanted slot:{" "}
                        {watch.wantedStart ? formatClientLabDate(watch.wantedStart) : ""} (
                        {watch.wantedStart ? formatClientLabTime(watch.wantedStart) : ""} -{" "}
                        {watch.wantedEnd ? formatClientLabTime(watch.wantedEnd) : ""})
                      </span>
                      {watch.flexibleDay && (
                        <span className="text-[11px] px-1.5 py-0.2 rounded bg-[#222a3a] text-[#6cd8cb] border border-[#6cd8cb]/20 font-mono">
                          Any free {watch.durationMinutes}m that day
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-[#64748b] font-mono flex items-center gap-3 pt-0.5">
                    <span>Created: {formatClientLabDate(watch.createdAt)}</span>
                    {isActive && <span>Expires: {formatClientLabDate(watch.expiresAt)}</span>}
                    {isSent && watch.sentAt && (
                      <span className="text-blue-400">
                        Notification sent on {formatClientLabDate(watch.sentAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isActive && (
                <div className="shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(watch.id)}
                    disabled={cancellingId === watch.id}
                    className="h-8 text-xs border-[#f43f5e]/30 bg-[#f43f5e]/10 text-[#f43f5e] hover:bg-[#f43f5e]/20 hover:text-white"
                  >
                    <XCircle className="size-3.5 mr-1" />
                    <span>Cancel alert</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
