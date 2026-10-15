"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { addEquipmentRecordAction, type EquipmentActionResult } from "@/actions/equipment";
import type {
  EquipmentRecordKind,
  EquipmentOutcome,
  ResourceStatus,
} from "@/generated/prisma/client";
import { addDaysToDay, todayDay } from "@/lib/equipment-dates";
import type { RecordDialogKindCategory } from "./record-equipment-dialog";

interface RecordEquipmentFormProps {
  resourceId: string;
  resourceName: string;
  resourceStatus: ResourceStatus;
  kindCategory: RecordDialogKindCategory;
  intervalDays?: number | null;
  actorName?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onRequestFailConfirm: (submitFn: () => void) => void;
}

export function RecordEquipmentForm({
  resourceId,
  resourceStatus,
  kindCategory,
  intervalDays,
  actorName = "",
  onSuccess,
  onCancel,
  onRequestFailConfirm,
}: RecordEquipmentFormProps) {
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

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
  const [workPerformed, setWorkPerformed] = React.useState("");
  const [externalCompany, setExternalCompany] = React.useState("");
  const [reference, setReference] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [nextDueOn, setNextDueOn] = React.useState(defaultNextDue);

  const isReview = kindCategory === "REPLACEMENT_REVIEW";
  const isCheckOrRepair = kindCategory === "CHECK_OR_REPAIR";
  const isWorkRequired = outcome === "PASS" || outcome === "FAIL";

  const doSubmit = async () => {
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("outcome", outcome);
    formData.append("performedOn", performedOn.trim());
    formData.append("performedBy", performedBy.trim());
    if (workPerformed.trim()) formData.append("workPerformed", workPerformed.trim());
    if (externalCompany.trim()) formData.append("externalCompany", externalCompany.trim());
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

        {isCheckOrRepair && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-navy uppercase tracking-wider">
              Activity type *
            </Label>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-navy">
                <input
                  type="radio"
                  name="activity-kind"
                  value="PERFORMANCE_CHECK"
                  checked={kind === "PERFORMANCE_CHECK"}
                  onChange={() => setKind("PERFORMANCE_CHECK")}
                  className="accent-teal"
                />
                <span>Performance check</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-navy">
                <input
                  type="radio"
                  name="activity-kind"
                  value="REPAIR"
                  checked={kind === "REPAIR"}
                  onChange={() => setKind("REPAIR")}
                  className="accent-teal"
                />
                <span>Repair</span>
              </label>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="rec-performed-on"
              className="text-xs font-bold text-navy uppercase tracking-wider"
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
              className="h-10 rounded-xl bg-canvas border-card-edge text-navy font-semibold text-xs"
            />
            {fieldErrors.performedOn && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.performedOn[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-navy uppercase tracking-wider">
              Result / Outcome *
            </Label>
            <div className="flex flex-wrap gap-3 pt-2">
              {isReview ? (
                <>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-teal">
                    <input
                      type="radio"
                      name="rec-outcome"
                      value="KEEP_IN_SERVICE"
                      checked={outcome === "KEEP_IN_SERVICE"}
                      onChange={() => setOutcome("KEEP_IN_SERVICE")}
                      className="accent-teal"
                    />
                    <span>Keep</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-red">
                    <input
                      type="radio"
                      name="rec-outcome"
                      value="REPLACE"
                      checked={outcome === "REPLACE"}
                      onChange={() => setOutcome("REPLACE")}
                      className="accent-red"
                    />
                    <span>Replace</span>
                  </label>
                </>
              ) : (
                <>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-teal">
                    <input
                      type="radio"
                      name="rec-outcome"
                      value="PASS"
                      checked={outcome === "PASS"}
                      onChange={() => setOutcome("PASS")}
                      className="accent-teal"
                    />
                    <span>Pass</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-red">
                    <input
                      type="radio"
                      name="rec-outcome"
                      value="FAIL"
                      checked={outcome === "FAIL"}
                      onChange={() => setOutcome("FAIL")}
                      className="accent-red"
                    />
                    <span>Fail</span>
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="rec-performed-by"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Performed by *
            </Label>
            <Input
              id="rec-performed-by"
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
              htmlFor="rec-company"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Company (if external)
            </Label>
            <Input
              id="rec-company"
              value={externalCompany}
              onChange={(e) => setExternalCompany(e.target.value)}
              placeholder="e.g. Thermo Fisher"
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
              htmlFor="rec-work-done"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Work done / changes made {isWorkRequired ? "*" : "(optional)"}
            </Label>
            <span className="text-[11px] text-muted font-medium">{workPerformed.length}/1000</span>
          </div>
          <textarea
            id="rec-work-done"
            rows={2}
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            placeholder="Describe the work done or changes made (e.g. sensor recalibrated, tubing flushed)..."
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
              htmlFor="rec-ref"
              className="text-xs font-bold text-navy uppercase tracking-wider"
            >
              Certificate / Ref no.
            </Label>
            <Input
              id="rec-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Optional cert or service #"
              maxLength={120}
              disabled={isPending}
              className="h-10 rounded-xl bg-canvas border-card-edge text-navy font-semibold text-xs"
            />
            {fieldErrors.reference && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.reference[0]}</p>
            )}
          </div>

          {(outcome === "PASS" || isReview) && (
            <div className="space-y-1.5">
              <Label
                htmlFor="rec-next-due"
                className="text-xs font-bold text-navy uppercase tracking-wider"
              >
                {isReview
                  ? outcome === "KEEP_IN_SERVICE"
                    ? "Keep until *"
                    : "Replace by *"
                  : "Next due date"}
              </Label>
              <Input
                id="rec-next-due"
                type="date"
                value={nextDueOn}
                onChange={(e) => setNextDueOn(e.target.value)}
                required={isReview}
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
            htmlFor="rec-notes"
            className="text-xs font-bold text-navy uppercase tracking-wider"
          >
            Notes {outcome === "FAIL" || outcome === "REPLACE" ? "*" : "(optional)"}
          </Label>
          <textarea
            id="rec-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              outcome === "FAIL"
                ? "Explain the failure cause, error details, and required remedy..."
                : outcome === "REPLACE"
                  ? "State reasons for replacement recommendation..."
                  : "Optional observation notes..."
            }
            required={outcome === "FAIL" || outcome === "REPLACE"}
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
            outcome === "FAIL" || outcome === "REPLACE"
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
