"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { markDoneAction, type EquipmentActionResult } from "@/actions/equipment";
import { EquipmentOutcome, ResourceStatus } from "@/generated/prisma/client";
import { addDaysToDay, todayDay } from "@/lib/equipment-dates";
import { formatEquipmentDay } from "@/lib/equipment-status";

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
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [showFailConfirm, setShowFailConfirm] = React.useState(false);

  const trackerLabel = tracker === "calibration" ? "Calibration" : "Service";
  const defaultNextDue =
    intervalDays && intervalDays > 0 ? addDaysToDay(todayDay(), intervalDays) : "";

  const [outcome, setOutcome] = React.useState<EquipmentOutcome>(EquipmentOutcome.PASS);
  const [performedBy, setPerformedBy] = React.useState(actorName);
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [nextDueOn, setNextDueOn] = React.useState(defaultNextDue);

  const resetForm = () => {
    setOutcome(EquipmentOutcome.PASS);
    setPerformedBy(actorName);
    setReference("");
    setNotes("");
    setNextDueOn(defaultNextDue);
    setError(null);
    setFieldErrors({});
    setShowFailConfirm(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const doSubmit = async () => {
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append("outcome", outcome);
    formData.append("performedBy", performedBy.trim());
    if (reference.trim()) formData.append("reference", reference.trim());
    if (notes.trim()) formData.append("notes", notes.trim());
    if (outcome === EquipmentOutcome.PASS && nextDueOn.trim()) {
      formData.append("nextDueOn", nextDueOn.trim());
    }

    const result: EquipmentActionResult = await markDoneAction(
      resourceId,
      tracker,
      null,
      formData,
    );
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to record result.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? "Result recorded successfully");
    setOpen(false);
    resetForm();
    router.refresh();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (outcome === EquipmentOutcome.FAIL && resourceStatus === ResourceStatus.ACTIVE) {
      setShowFailConfirm(true);
      return;
    }
    doSubmit();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button
              size="sm"
              className="gap-1.5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Mark as done</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-[#1e293b]">
              <DialogTitle>Mark {trackerLabel.toLowerCase()} as done</DialogTitle>
              <DialogDescription>
                {resourceName} &bull; Scheduled due: {formatEquipmentDay(dueOn)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Result: Pass or Fail */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                  Result *
                </Label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                    <input
                      type="radio"
                      name="mark-done-outcome"
                      value={EquipmentOutcome.PASS}
                      checked={outcome === EquipmentOutcome.PASS}
                      onChange={() => setOutcome(EquipmentOutcome.PASS)}
                      className="accent-[#6cd8cb]"
                    />
                    <span>Pass</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-rose-300">
                    <input
                      type="radio"
                      name="mark-done-outcome"
                      value={EquipmentOutcome.FAIL}
                      checked={outcome === EquipmentOutcome.FAIL}
                      onChange={() => setOutcome(EquipmentOutcome.FAIL)}
                      className="accent-rose-500"
                    />
                    <span>Fail</span>
                  </label>
                </div>
              </div>

              {/* Done by */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="done-by"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Done by *
                </Label>
                <Input
                  id="done-by"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder="Person or service company"
                  required
                  maxLength={120}
                  disabled={isPending}
                />
                {fieldErrors.performedBy && (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.performedBy[0]}</p>
                )}
              </div>

              {/* Certificate or reference */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="done-ref"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Certificate or reference
                </Label>
                <Input
                  id="done-ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional reference / cert number"
                  maxLength={120}
                  disabled={isPending}
                />
                {fieldErrors.reference && (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.reference[0]}</p>
                )}
              </div>

              {/* Next due (for Pass) */}
              {outcome === EquipmentOutcome.PASS && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="done-next-due"
                    className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                  >
                    Next {tracker === "calibration" ? "calibration" : "service"} due *
                  </Label>
                  <Input
                    id="done-next-due"
                    type="date"
                    value={nextDueOn}
                    onChange={(e) => setNextDueOn(e.target.value)}
                    required
                    disabled={isPending}
                  />
                  {fieldErrors.nextDueOn && (
                    <p className="text-xs font-medium text-destructive">{fieldErrors.nextDueOn[0]}</p>
                  )}
                </div>
              )}

              {/* Notes (required for Fail) */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="done-notes"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Notes {outcome === EquipmentOutcome.FAIL ? "*" : "(optional)"}
                </Label>
                <textarea
                  id="done-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    outcome === EquipmentOutcome.FAIL
                      ? "Explain the failure cause, error codes, and required remedy..."
                      : "Optional calibration or maintenance notes..."
                  }
                  required={outcome === EquipmentOutcome.FAIL}
                  maxLength={500}
                  disabled={isPending}
                  className="w-full rounded-md border border-[#334155] bg-[#060e1d] p-2.5 text-xs text-white placeholder:text-[#64748b] focus:border-[#6cd8cb] focus:outline-none resize-none"
                />
                {fieldErrors.notes && (
                  <p className="text-xs font-medium text-destructive">{fieldErrors.notes[0]}</p>
                )}
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-[#1e293b] bg-[#141c2b] flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className={
                  outcome === EquipmentOutcome.FAIL
                    ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                    : "bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold"
                }
              >
                {isPending ? "Saving..." : outcome === EquipmentOutcome.FAIL ? "Record failure" : "Save result"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showFailConfirm} onOpenChange={setShowFailConfirm}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-400">Record verification failure?</AlertDialogTitle>
            <AlertDialogDescription>
              Saving a failed result takes {resourceName} out of service and cancels{" "}
              {affectedBookingsCount} booking{affectedBookingsCount === 1 ? "" : "s"} that have not
              started.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFailConfirm(false)}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFailConfirm(false);
                doSubmit();
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
