"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateSectionAction, type ActionResult } from "@/actions/settings";
import type { SectionWithCounts } from "@/services/settings";

interface EditSectionDialogProps {
  section: SectionWithCounts;
  trigger?: React.ReactNode;
}

export function EditSectionDialog({ section, trigger }: EditSectionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(section.name);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(section.name);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);

    const result: ActionResult = await updateSectionAction(section.id, null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save changes.");
      return;
    }

    toast.success(result.message ?? "Changes saved");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-mint text-xs font-semibold text-navy hover:text-teal border border-card-edge shadow-2xs transition-all duration-150 active:scale-95"
          >
            <Pencil className="size-3.5 text-teal" />
            <span>Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit section</DialogTitle>
            <DialogDescription>
              Update the name for this laboratory section or department.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-section-name-${section.id}`}
                className="text-xs font-semibold text-navy"
              >
                Section Name
              </Label>
              <Input
                id={`edit-section-name-${section.id}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Clinical Biochemistry"
                required
                minLength={2}
                maxLength={80}
                className="h-10 bg-card border-card-edge text-navy text-xs rounded-xl focus-visible:border-teal"
              />
            </div>

            {/* Telemetry Stats Callout */}
            <div className="p-3 bg-canvas border border-card-edge rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-teal font-bold">ℹ</span>
                <span className="text-xs text-muted">
                  Associated with{" "}
                  <strong className="text-navy font-semibold">
                    {section._count.resources} resources
                  </strong>{" "}
                  and{" "}
                  <strong className="text-navy font-semibold">{section._count.users} users</strong>.
                </span>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-soft text-teal-deep border border-teal/20">
                Active
              </span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-card-edge">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-navy hover:bg-mint rounded-xl border-card-edge"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-teal hover:bg-teal-deep text-white font-bold text-xs px-5 py-2 rounded-xl shadow-2xs transition-all active:scale-95"
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
