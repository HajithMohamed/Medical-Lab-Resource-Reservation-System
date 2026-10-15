"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createSectionAction, type ActionResult } from "@/actions/settings";

export function SectionDialog() {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setName("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);

    const result: ActionResult = await createSectionAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to add section.");
      return;
    }

    toast.success(result.message ?? "Section added");
    setOpen(false);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-teal hover:bg-teal-deep text-white font-bold text-xs rounded-xl shadow-2xs">
          <Plus className="size-4" />
          <span>Add section</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add section</DialogTitle>
            <DialogDescription>Create a new laboratory section or department.</DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="section-name" className="text-xs font-semibold text-navy">
              Section Name
            </Label>
            <Input
              id="section-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clinical Biochemistry"
              required
              minLength={2}
              maxLength={80}
              autoFocus
              className="h-10 bg-card border-card-edge text-navy text-xs rounded-xl focus-visible:border-teal"
            />
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
              {isPending ? "Adding..." : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
