"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
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
import { RecordEquipmentForm } from "./record-equipment-form";

export type RecordDialogKindCategory =
  "CALIBRATION" | "PREVENTIVE_MAINTENANCE" | "CHECK_OR_REPAIR" | "REPLACEMENT_REVIEW";

interface RecordEquipmentDialogProps {
  resourceId: string;
  resourceName: string;
  resourceStatus: ResourceStatus;
  kindCategory: RecordDialogKindCategory;
  intervalDays?: number | null;
  affectedBookingsCount?: number;
  actorName?: string;
  trigger?: React.ReactNode;
}

export function RecordEquipmentDialog({
  resourceId,
  resourceName,
  resourceStatus,
  kindCategory,
  intervalDays,
  affectedBookingsCount = 0,
  actorName = "",
  trigger,
}: RecordEquipmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [showFailConfirm, setShowFailConfirm] = React.useState(false);
  const pendingSubmitRef = React.useRef<(() => void) | null>(null);

  const getDialogTitle = () => {
    switch (kindCategory) {
      case "CALIBRATION":
        return "Record calibration";
      case "PREVENTIVE_MAINTENANCE":
        return "Record maintenance";
      case "CHECK_OR_REPAIR":
        return "Record check or repair";
      case "REPLACEMENT_REVIEW":
        return "Record lifecycle review";
    }
  };

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
              className="gap-1.5 border-card-edge bg-card text-navy hover:text-teal hover:bg-mint text-xs font-bold rounded-xl shadow-2xs"
            >
              <PlusCircle className="size-3.5 text-teal" />
              <span>{getDialogTitle()}</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden bg-card border border-card-edge shadow-v4 rounded-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-card-edge bg-canvas/60">
            <DialogTitle className="text-navy font-bold text-base">{getDialogTitle()}</DialogTitle>
            <DialogDescription className="text-muted text-xs">{resourceName}</DialogDescription>
          </DialogHeader>

          {open && (
            <RecordEquipmentForm
              resourceId={resourceId}
              resourceName={resourceName}
              resourceStatus={resourceStatus}
              kindCategory={kindCategory}
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
