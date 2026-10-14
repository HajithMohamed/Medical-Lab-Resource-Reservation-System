"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { XCircle, AlertTriangle } from "lucide-react";
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
import { markNotDoneAction, type EquipmentActionResult } from "@/actions/equipment";
import { addDaysToDay } from "@/lib/equipment-dates";
import { formatEquipmentDay } from "@/lib/equipment-status";

interface MarkNotDoneDialogProps {
  resourceId: string;
  resourceName: string;
  tracker: "calibration" | "maintenance";
  dueOn: string;
  affectedBookingsCount?: number;
  trigger?: React.ReactNode;
}

export function MarkNotDoneDialog({
  resourceId,
  resourceName,
  tracker,
  dueOn,
  affectedBookingsCount = 0,
  trigger,
}: MarkNotDoneDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [notes, setNotes] = React.useState("");
  const [plannedDate, setPlannedDate] = React.useState("");

  const trackerLabel = tracker === "calibration" ? "Calibration" : "Service";
  const formattedDueOn = formatEquipmentDay(dueOn);
  const tomorrowDay = addDaysToDay(dueOn, 1);
  const formattedTomorrow = formatEquipmentDay(tomorrowDay);

  const resetForm = () => {
    setNotes("");
    setPlannedDate("");
    setError(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.append("notes", notes.trim());
    if (plannedDate.trim()) {
      formData.append("plannedDate", plannedDate.trim());
    }

    const result: EquipmentActionResult = await markNotDoneAction(
      resourceId,
      tracker,
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

    toast.info(result.message ?? "Saved as not done");
    setOpen(false);
    resetForm();
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-[#334155] text-slate-300 hover:text-white hover:bg-[#18202f] text-xs"
          >
            <XCircle className="size-3.5 text-amber-400" />
            <span>Not done</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-[#1e293b]">
            <DialogTitle>Mark {trackerLabel.toLowerCase()} not done</DialogTitle>
            <DialogDescription>
              {resourceName} &bull; Scheduled due: {formattedDueOn}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Clear warning callout */}
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Notice: Due date will not change</span>
              </div>
              <p className="leading-relaxed">
                The due date stays <strong className="text-white">{formattedDueOn}</strong>. From{" "}
                <strong className="text-white">{formattedTomorrow}</strong> nobody can book{" "}
                <strong className="text-white">{resourceName}</strong> until the{" "}
                {trackerLabel.toLowerCase()} is recorded.
              </p>
              {affectedBookingsCount > 0 && (
                <p className="text-amber-300/90 font-medium">
                  {affectedBookingsCount} confirmed booking{affectedBookingsCount === 1 ? "" : "s"}{" "}
                  end after that day.
                </p>
              )}
            </div>

            {/* Reason (required) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="not-done-reason"
                className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
              >
                Reason why it did not happen today *
              </Label>
              <textarea
                id="not-done-reason"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Service engineer did not arrive as scheduled..."
                required
                maxLength={500}
                disabled={isPending}
                className="w-full rounded-md border border-[#334155] bg-[#060e1d] p-2.5 text-xs text-white placeholder:text-[#64748b] focus:border-[#6cd8cb] focus:outline-none resize-none"
              />
              {fieldErrors.notes && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.notes[0]}</p>
              )}
            </div>

            {/* Planned new date (optional) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="planned-date"
                className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
              >
                Planned new date (optional)
              </Label>
              <Input
                id="planned-date"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                disabled={isPending}
              />
              <p className="text-[11px] text-[#94a3b8]">
                Informational target date for the laboratory team
              </p>
              {fieldErrors.plannedDate && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.plannedDate[0]}</p>
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isPending ? "Saving..." : "Save as not done"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
