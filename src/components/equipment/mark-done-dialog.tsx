"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ResourceStatus } from "@/generated/prisma/client";
import { formatEquipmentDay } from "@/lib/equipment-status";
import { MarkDoneForm } from "./mark-done-form";

interface MarkDoneDialogProps {
  resourceId: string;
  resourceName: string;
  resourceStatus: ResourceStatus;
  tracker: "calibration" | "maintenance";
  dueOn: string;
  intervalDays?: number | null;
  affectedBookingsCount?: number;
  actorName?: string;
  trigger?: React.ReactNode;
}

export function MarkDoneDialog({
  resourceId,
  resourceName,
  resourceStatus,
  tracker,
  dueOn,
  intervalDays,
  affectedBookingsCount = 0,
  actorName = "",
  trigger,
}: MarkDoneDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [showFailConfirm, setShowFailConfirm] = React.useState(false);
  const pendingSubmitRef = React.useRef<(() => void) | null>(null);

  const trackerLabel = tracker === "calibration" ? "Calibration" : "Service";

  const handleSuccess = () => {
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-emerald-500/40 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/30 text-xs font-mono"
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>Mark as done</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-[#1e293b]">
            <DialogTitle>Record {trackerLabel} result</DialogTitle>
            <DialogDescription>
              {resourceName} &bull; Scheduled {formatEquipmentDay(dueOn)}
            </DialogDescription>
          </DialogHeader>

          {open && (
            <MarkDoneForm
              resourceId={resourceId}
              resourceStatus={resourceStatus}
              tracker={tracker}
              intervalDays={intervalDays}
              actorName={actorName}
              onSuccess={handleSuccess}
              onCancel={() => setOpen(false)}
              onRequestFailConfirm={(submitFn) => {
                pendingSubmitRef.current = submitFn;
                setShowFailConfirm(true);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showFailConfirm} onOpenChange={setShowFailConfirm}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-400">
              Record verification failure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Saving a failed result takes {resourceName} out of service and cancels{" "}
              {affectedBookingsCount} booking{affectedBookingsCount === 1 ? "" : "s"} that have not
              started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFailConfirm(false)}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFailConfirm(false);
                pendingSubmitRef.current?.();
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              Take out of service & save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
