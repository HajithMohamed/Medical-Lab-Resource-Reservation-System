"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bell, BellRing, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { createWatchAction } from "@/actions/notifications";
import { formatClientLabDate, formatClientLabTime } from "@/lib/client-time";

export interface WatchButtonProps {
  resourceId: string;
  resourceName: string;
  kind: "BACK_IN_SERVICE" | "SLOT_FREE";
  wantedStart?: string | Date | null;
  wantedEnd?: string | Date | null;
  durationMinutes?: number | null;
  initialWatched?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
}

export function WatchButton({
  resourceId,
  resourceName,
  kind,
  wantedStart,
  wantedEnd,
  durationMinutes,
  initialWatched = false,
  size = "sm",
  className,
  label,
}: WatchButtonProps) {
  const [localWatchedOverride, setLocalWatchedOverride] = React.useState<boolean | null>(null);
  const [open, setOpen] = React.useState(false);
  const [flexibleDay, setFlexibleDay] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const watched = localWatchedOverride ?? initialWatched;

  if (watched) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-soft text-teal-deep border border-teal-line ${className ?? ""}`}
        title="You have an active alert set for this resource"
      >
        <BellRing className="size-3.5" />
        <span>Alert on</span>
      </div>
    );
  }

  // Case 1: BACK_IN_SERVICE
  if (kind === "BACK_IN_SERVICE") {
    const handleWatchBackInService = () => {
      startTransition(async () => {
        try {
          const res = await createWatchAction({
            resourceId,
            kind: "BACK_IN_SERVICE",
          });
          if (res.ok) {
            setLocalWatchedOverride(true);
            toast.success("We'll let you know.");
          } else {
            toast.error(res.error ?? "Could not create alert.");
          }
        } catch {
          toast.error("Could not create alert.");
        }
      });
    };

    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleWatchBackInService}
        disabled={isPending}
        className={`text-xs font-semibold border-card-edge bg-card text-teal hover:text-teal-deep hover:bg-mint rounded-xl gap-1.5 shadow-2xs cursor-pointer ${className ?? ""}`}
      >
        <Bell className="size-3.5" />
        <span>{isPending ? "Setting..." : (label ?? "Notify me when back in service")}</span>
      </Button>
    );
  }

  // Case 2: SLOT_FREE
  const startDate = wantedStart ? new Date(wantedStart) : null;
  const endDate = wantedEnd ? new Date(wantedEnd) : null;
  const formattedDate = startDate ? formatClientLabDate(startDate) : "";
  const formattedStartTime = startDate ? formatClientLabTime(startDate) : "";
  const formattedEndTime = endDate ? formatClientLabTime(endDate) : "";

  const handleWatchSlot = () => {
    startTransition(async () => {
      try {
        const res = await createWatchAction({
          resourceId,
          kind: "SLOT_FREE",
          wantedStart: startDate ? startDate.toISOString() : undefined,
          wantedEnd: endDate ? endDate.toISOString() : undefined,
          durationMinutes: durationMinutes ?? undefined,
          flexibleDay,
        });

        if (res.ok) {
          setLocalWatchedOverride(true);
          setOpen(false);
          toast.success("We'll let you know.");
        } else {
          toast.error(res.error ?? "Could not create alert.");
        }
      } catch {
        toast.error("Could not create alert.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className={`text-xs font-semibold border-card-edge bg-card text-teal hover:text-teal-deep hover:bg-mint rounded-xl gap-1.5 shadow-2xs cursor-pointer ${className ?? ""}`}
        >
          <Bell className="size-3.5" />
          <span>Notify me when it&apos;s free</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-navy flex items-center gap-2">
            <Bell className="size-4 text-teal" />
            Notify me when free
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <p className="text-muted leading-relaxed font-normal">
            We will alert you immediately in-app if a booking is cancelled and{" "}
            <strong className="text-navy font-bold">{resourceName}</strong> becomes available.
          </p>

          <div className="p-3 rounded-2xl border border-card-edge bg-canvas/70 space-y-1.5 text-xs">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
              Requested Time:
            </div>
            <div className="text-navy font-bold flex items-center gap-2 tab">
              <Clock className="size-3.5 text-teal" />
              <span>
                {formattedDate} &bull; {formattedStartTime} - {formattedEndTime}
                {durationMinutes ? ` (${durationMinutes}m)` : ""}
              </span>
            </div>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-card-edge hover:bg-mint/30 cursor-pointer transition-colors">
            <Checkbox
              id="flexible-day-checkbox"
              checked={flexibleDay}
              onCheckedChange={(c) => setFlexibleDay(Boolean(c))}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="font-bold text-navy block text-xs">Any free slot that day</span>
              <span className="text-muted block text-[11.5px] font-normal leading-relaxed">
                Also alert me if any other {durationMinutes ?? 60}-minute slot opens up anywhere on{" "}
                {formattedDate}.
              </span>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="text-xs font-semibold text-muted hover:text-navy hover:bg-mint rounded-xl"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleWatchSlot}
            disabled={isPending}
            className="bg-teal hover:bg-teal-deep text-white font-bold text-xs rounded-xl shadow-2xs"
          >
            {isPending ? "Setting alert..." : "Set Alert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
