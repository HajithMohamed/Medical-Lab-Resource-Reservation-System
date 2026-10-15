"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { markDoneAction, type EquipmentActionResult } from "@/actions/equipment";
import type { EquipmentOutcome, ResourceStatus } from "@/generated/prisma/client";
import { addDaysToDay, todayDay } from "@/lib/equipment-dates";

interface MarkDoneFormProps {
  resourceId: string;
  resourceStatus: ResourceStatus;
  tracker: "calibration" | "maintenance";
  intervalDays?: number | null;
  actorName?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onRequestFailConfirm: (submitFn: () => void) => void;
}

export function MarkDoneForm({
  resourceId,
  resourceStatus,
  tracker,
  intervalDays,
  actorName = "",
  onSuccess,
  onCancel,
  onRequestFailConfirm,
}: MarkDoneFormProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const defaultNextDue =
    intervalDays && intervalDays > 0 ? addDaysToDay(todayDay(), intervalDays) : "";

  const [outcome, setOutcome] = React.useState<EquipmentOutcome>("PASS");
  const [performedBy, setPerformedBy] = React.useState(actorName);
  const [workPerformed, setWorkPerformed] = React.useState("");
  const [externalCompany, setExternalCompany] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [nextDueOn, setNextDueOn] = React.useState(defaultNextDue);

  const isWorkRequired = outcome === "PASS" || outcome === "FAIL";

  const doSubmit = async () => {
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append("outcome", outcome);
    formData.append("performedBy", performedBy.trim());
    if (workPerformed.trim()) formData.append("workPerformed", workPerformed.trim());
    if (externalCompany.trim()) formData.append("externalCompany", externalCompany.trim());
    if (reference.trim()) formData.append("reference", reference.trim());
    if (notes.trim()) formData.append("notes", notes.trim());
    if (outcome === "PASS" && nextDueOn.trim()) {
      formData.append("nextDueOn", nextDueOn.trim());
    }

    const result: EquipmentActionResult = await markDoneAction(resourceId, tracker, null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to record result.");
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      return;
    }

    toast.success(result.message ?? "Result recorded successfully");
    onSuccess();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (outcome === "FAIL" && resourceStatus === "ACTIVE") {
      onRequestFailConfirm(() => doSubmit());
      return;
    }
    doSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Outcome selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-navy uppercase tracking-wider">
            Result *
          </Label>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-teal">
              <input
                type="radio"
                name="mark-outcome"
                value="PASS"
                checked={outcome === "PASS"}
                onChange={() => setOutcome("PASS")}
                className="accent-teal"
              />
              <span>Pass (meets specifications)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-red">
              <input
                type="radio"
                name="mark-outcome"
                value="FAIL"
                checked={outcome === "FAIL"}
                onChange={() => setOutcome("FAIL")}
                className="accent-red"
              />
              <span>Fail (out of tolerance)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="mark-performed-by"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Performed by *
            </Label>
            <Input
              id="mark-performed-by"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="Technician or engineer"
              required
              maxLength={120}
              disabled={isPending}
              className="h-10 rounded-xl bg-canvas border-card-edge text-navy font-semibold text-xs"
            />
            {fieldErrors.performedBy && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.performedBy[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="mark-company"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Company (if external)
            </Label>
            <Input
              id="mark-company"
              value={externalCompany}
              onChange={(e) => setExternalCompany(e.target.value)}
              placeholder="e.g. Roche, Beckman"
              maxLength={120}
              disabled={isPending}
              className="h-10 rounded-xl bg-canvas border-card-edge text-navy font-semibold text-xs"
            />
            {fieldErrors.externalCompany && (
              <p className="text-xs font-medium text-destructive">
                {fieldErrors.externalCompany[0]}
              </p>
            )}
          </div>
        </div>

        {/* Work done / changes made (required for Pass/Fail) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="mark-work-done"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Work done / changes made {isWorkRequired ? "*" : "(optional)"}
            </Label>
            <span className="text-[11px] text-muted font-medium">
              {workPerformed.length}/1000
            </span>
          </div>
          <textarea
            id="mark-work-done"
            rows={2}
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            placeholder="Describe the work done or changes made (e.g. calibrated sensors, replaced battery)..."
            required={isWorkRequired}
            maxLength={1000}
            disabled={isPending}
            className="w-full rounded-xl border border-card-edge bg-canvas p-3 text-xs text-navy font-semibold placeholder:text-muted focus:border-teal outline-none resize-none"
          />
          {fieldErrors.workPerformed && (
            <p className="text-xs font-medium text-destructive">{fieldErrors.workPerformed[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="mark-ref"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Certificate / Reference
            </Label>
            <Input
              id="mark-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional certificate #"
              maxLength={120}
              disabled={isPending}
              className="h-10 rounded-xl bg-canvas border-card-edge text-navy font-semibold text-xs"
            />
            {fieldErrors.reference && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.reference[0]}</p>
            )}
          </div>

          {outcome === "PASS" && (
            <div className="space-y-1.5">
              <Label
                htmlFor="mark-next-due"
                className="text-xs font-bold text-navy uppercase tracking-wider"
              >
                Next due date
              </Label>
              <Input
                id="mark-next-due"
                type="date"
                value={nextDueOn}
                onChange={(e) => setNextDueOn(e.target.value)}
                disabled={isPending}
                className="h-10 rounded-xl bg-canvas border-card-edge text-navy font-semibold text-xs"
              />
              {fieldErrors.nextDueOn && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.nextDueOn[0]}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="mark-notes"
            className="text-xs font-bold text-navy uppercase tracking-wider"
          >
            Notes {outcome === "FAIL" ? "*" : "(optional)"}
          </Label>
          <textarea
            id="mark-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              outcome === "FAIL"
                ? "Explain the failure cause, error details, and required remedy..."
                : "Optional observations..."
            }
            required={outcome === "FAIL"}
            maxLength={500}
            disabled={isPending}
            className="w-full rounded-xl border border-card-edge bg-canvas p-3 text-xs text-navy font-semibold placeholder:text-muted focus:border-teal outline-none resize-none"
          />
          {fieldErrors.notes && (
            <p className="text-xs font-medium text-destructive">{fieldErrors.notes[0]}</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-line bg-canvas/40 flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className={
            outcome === "FAIL"
              ? "bg-red hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs"
              : "bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-teal hover:opacity-95"
          }
        >
          {isPending ? "Saving..." : outcome === "FAIL" ? "Record failure" : "Save result"}
        </Button>
      </div>
    </form>
  );
}
