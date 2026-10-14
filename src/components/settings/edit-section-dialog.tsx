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
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
            <Pencil className="size-3.5 text-primary" />
            <span>Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
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

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-section-name-${section.id}`}>Name</Label>
              <Input
                id={`edit-section-name-${section.id}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Clinical Biochemistry"
                required
                minLength={2}
                maxLength={80}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
              Associated with{" "}
              <span className="font-semibold text-foreground">{section._count.resources}</span>{" "}
              resources and{" "}
              <span className="font-semibold text-foreground">{section._count.users}</span> users.
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
