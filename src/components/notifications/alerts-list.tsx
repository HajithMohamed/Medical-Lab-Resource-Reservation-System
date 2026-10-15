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
      <div className="text-xs text-muted px-1">
        Showing {watches.length} alert{watches.length === 1 ? "" : "s"}
      </div>

      <div className="divide-y divide-line border border-card-edge rounded-[20px] overflow-hidden bg-card shadow-v4">
        {watches.map((watch) => {
          const isActive = watch.status === "ACTIVE";
          const isSent = watch.status === "SENT";
          const isExpired = watch.status === "EXPIRED";

          let statusBadgeClass = "bg-canvas text-muted border-card-edge";
          if (isActive) {
            statusBadgeClass = "bg-teal-soft text-teal-deep border border-teal-line";
          } else if (isSent) {
            statusBadgeClass = "bg-blue-soft text-blue border border-blue/20";
          } else if (isExpired) {
            statusBadgeClass = "bg-amber-soft text-amber border border-amber-line";
          }

          return (
            <div
              key={watch.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-mint/30 transition-colors"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-navy text-sm tracking-tight">
                    {watch.resource.name}
                  </span>
                  <span className="text-xs text-muted">({watch.resource.site.name})</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${statusBadgeClass}`}
                  >
                    {watch.status}
                  </span>
                </div>

                <div className="text-xs text-muted space-y-1">
                  {watch.kind === "BACK_IN_SERVICE" ? (
                    <div className="flex items-center gap-1.5 text-navy font-medium">
                      <Bell className="size-3.5 text-teal" />
                      <span>Alert when back in service</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap text-navy font-medium">
                      <Clock className="size-3.5 text-teal" />
                      <span>
                        Wanted slot:{" "}
                        {watch.wantedStart ? formatClientLabDate(watch.wantedStart) : ""} (
                        {watch.wantedStart ? formatClientLabTime(watch.wantedStart) : ""} -{" "}
                        {watch.wantedEnd ? formatClientLabTime(watch.wantedEnd) : ""})
                      </span>
                      {watch.flexibleDay && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-soft text-teal font-bold">
                          Any free {watch.durationMinutes}m that day
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-faint flex items-center gap-3 pt-0.5">
                    <span>Created: {formatClientLabDate(watch.createdAt)}</span>
                    {isActive && <span>Expires: {formatClientLabDate(watch.expiresAt)}</span>}
                    {isSent && watch.sentAt && (
                      <span className="text-blue-500 font-bold">
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
                    className="h-9 px-3 rounded-xl text-xs font-bold border-red/30 bg-red-soft text-red hover:bg-red hover:text-white transition-colors"
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
