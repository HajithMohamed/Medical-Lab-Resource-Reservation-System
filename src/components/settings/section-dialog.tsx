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
        <Button className="gap-2 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-xs">
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
            <Label htmlFor="section-name" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
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
            />
          </div>

          <DialogFooter className="pt-3 border-t border-[#334155]/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-[#dbe2f8] hover:bg-[#222a3a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono px-5 py-2 rounded-lg transition-all duration-150 active:scale-[0.98]"
            >
              {isPending ? "Adding..." : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
