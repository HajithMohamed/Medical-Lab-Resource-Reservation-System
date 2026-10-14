"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
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
import { addEquipmentRecordAction, type EquipmentActionResult } from "@/actions/equipment";
import type {
  EquipmentRecordKind,
  EquipmentOutcome,
  ResourceStatus,
} from "@/generated/prisma/client";
import { addDaysToDay, todayDay } from "@/lib/equipment-dates";

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
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [showFailConfirm, setShowFailConfirm] = React.useState(false);

  const getInitialKind = (): EquipmentRecordKind => {
    if (kindCategory === "CALIBRATION") return "CALIBRATION";
    if (kindCategory === "PREVENTIVE_MAINTENANCE") return "PREVENTIVE_MAINTENANCE";
    if (kindCategory === "REPLACEMENT_REVIEW") return "REPLACEMENT_REVIEW";
    return "PERFORMANCE_CHECK";
  };

  const getInitialOutcome = (): EquipmentOutcome => {
    if (kindCategory === "REPLACEMENT_REVIEW") return "KEEP_IN_SERVICE";
    return "PASS";
  };

  const defaultNextDue =
    intervalDays && intervalDays > 0 ? addDaysToDay(todayDay(), intervalDays) : "";

  const [kind, setKind] = React.useState<EquipmentRecordKind>(getInitialKind);
  const [outcome, setOutcome] = React.useState<EquipmentOutcome>(getInitialOutcome);
  const [performedOn, setPerformedOn] = React.useState(todayDay);
  const [performedBy, setPerformedBy] = React.useState(actorName);
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [nextDueOn, setNextDueOn] = React.useState(defaultNextDue);

  const resetForm = () => {
    setKind(getInitialKind());
    setOutcome(getInitialOutcome());
    setPerformedOn(todayDay());
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

  const doSubmit = async () => {
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("outcome", outcome);
    formData.append("performedOn", performedOn.trim());
    formData.append("performedBy", performedBy.trim());
    if (reference.trim()) formData.append("reference", reference.trim());
    if (notes.trim()) formData.append("notes", notes.trim());
    if (nextDueOn.trim()) formData.append("nextDueOn", nextDueOn.trim());

    const result: EquipmentActionResult = await addEquipmentRecordAction(
      resourceId,
      null,
      formData,
    );
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save record.");
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
    if (outcome === "FAIL" && resourceStatus === "ACTIVE") {
      setShowFailConfirm(true);
      return;
    }
    doSubmit();
  };

  const isReview = kindCategory === "REPLACEMENT_REVIEW";
  const isCheckOrRepair = kindCategory === "CHECK_OR_REPAIR";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-[#334155] text-slate-200 hover:text-white hover:bg-[#18202f] text-xs font-mono"
            >
              <PlusCircle className="size-3.5 text-[#6cd8cb]" />
              <span>{getDialogTitle()}</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
            <DialogHeader className="p-6 pb-4 border-b border-[#1e293b]">
              <DialogTitle>{getDialogTitle()}</DialogTitle>
              <DialogDescription>{resourceName}</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Sub-kind picker if check or repair */}
              {isCheckOrRepair && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                    Activity type *
                  </Label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                      <input
                        type="radio"
                        name="activity-kind"
                        value="PERFORMANCE_CHECK"
                        checked={kind === "PERFORMANCE_CHECK"}
                        onChange={() => setKind("PERFORMANCE_CHECK")}
                        className="accent-[#6cd8cb]"
                      />
                      <span>Performance check</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-white">
                      <input
                        type="radio"
                        name="activity-kind"
                        value="REPAIR"
                        checked={kind === "REPAIR"}
                        onChange={() => setKind("REPAIR")}
                        className="accent-[#6cd8cb]"
                      />
                      <span>Repair</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Date performed */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="rec-performed-on"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Date performed *
                </Label>
                <Input
                  id="rec-performed-on"
                  type="date"
                  value={performedOn}
                  onChange={(e) => setPerformedOn(e.target.value)}
                  required
                  disabled={isPending}
                />
                {fieldErrors.performedOn && (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.performedOn[0]}
                  </p>
                )}
              </div>

              {/* Outcome picker tailored to kind */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                  Result / Outcome *
                </Label>
                <div className="flex flex-wrap gap-4 pt-1">
                  {isReview ? (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-emerald-300">
                        <input
                          type="radio"
                          name="rec-outcome"
                          value="KEEP_IN_SERVICE"
                          checked={outcome === "KEEP_IN_SERVICE"}
                          onChange={() => setOutcome("KEEP_IN_SERVICE")}
                          className="accent-emerald-500"
                        />
                        <span>Keep in service</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-rose-300">
                        <input
                          type="radio"
                          name="rec-outcome"
                          value="REPLACE"
                          checked={outcome === "REPLACE"}
                          onChange={() => setOutcome("REPLACE")}
                          className="accent-rose-500"
                        />
                        <span>Replace</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-emerald-300">
                        <input
                          type="radio"
                          name="rec-outcome"
                          value="PASS"
                          checked={outcome === "PASS"}
                          onChange={() => setOutcome("PASS")}
                          className="accent-emerald-500"
                        />
                        <span>Pass</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-rose-300">
                        <input
                          type="radio"
                          name="rec-outcome"
                          value="FAIL"
                          checked={outcome === "FAIL"}
                          onChange={() => setOutcome("FAIL")}
                          className="accent-rose-500"
                        />
                        <span>Fail</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* Performed by */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="rec-performed-by"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Performed by *
                </Label>
                <Input
                  id="rec-performed-by"
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  placeholder="Person or service company"
                  required
                  maxLength={120}
                  disabled={isPending}
                />
                {fieldErrors.performedBy && (
                  <p className="text-xs font-medium text-destructive">
                    {fieldErrors.performedBy[0]}
                  </p>
                )}
              </div>

              {/* Certificate or reference */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="rec-ref"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Certificate or reference
                </Label>
                <Input
                  id="rec-ref"
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

              {/* Next due date */}
              {(outcome === "PASS" || isReview) && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="rec-next-due"
                    className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                  >
                    {isReview
                      ? outcome === "KEEP_IN_SERVICE"
                        ? "Keep in service until *"
                        : "Replace by *"
                      : "Next due date *"}
                  </Label>
                  <Input
                    id="rec-next-due"
                    type="date"
                    value={nextDueOn}
                    onChange={(e) => setNextDueOn(e.target.value)}
                    required={isReview}
                    disabled={isPending}
                  />
                  {fieldErrors.nextDueOn && (
                    <p className="text-xs font-medium text-destructive">
                      {fieldErrors.nextDueOn[0]}
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="rec-notes"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Notes {outcome === "FAIL" || outcome === "REPLACE" ? "*" : "(optional)"}
                </Label>
                <textarea
                  id="rec-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    outcome === "FAIL"
                      ? "Explain the failure cause, error details, and required remedy..."
                      : outcome === "REPLACE"
                        ? "State reasons for replacement recommendation and budget timeframe..."
                        : "Optional verification or observation notes..."
                  }
                  required={outcome === "FAIL" || outcome === "REPLACE"}
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
                  outcome === "FAIL"
                    ? "bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                    : "bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold"
                }
              >
                {isPending ? "Saving..." : outcome === "FAIL" ? "Record failure" : "Save result"}
              </Button>
            </DialogFooter>
          </form>
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
