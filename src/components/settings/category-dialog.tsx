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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/category-icon";
import {
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_LABELS,
  type CategoryIconKey,
} from "@/config/category-icons";
import { formatMinutes } from "@/lib/format";
import { createCategoryAction, type ActionResult } from "@/actions/settings";

export function CategoryDialog() {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [maxMinutes, setMaxMinutes] = React.useState("240");
  const [iconKey, setIconKey] = React.useState<CategoryIconKey>("other");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setName("");
      setMaxMinutes("240");
      setIconKey("other");
    }
  };

  const minutesNumber = Number(maxMinutes);
  const liveHint =
    !Number.isNaN(minutesNumber) && minutesNumber > 0 ? `= ${formatMinutes(minutesNumber)}` : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("maxBookingMinutes", maxMinutes);
    formData.set("iconKey", iconKey);

    const result: ActionResult = await createCategoryAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to add category.");
      return;
    }

    toast.success(result.message ?? "Category added");
    setOpen(false);
    setName("");
    setMaxMinutes("240");
    setIconKey("other");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-xs">
          <Plus className="size-4" />
          <span>Add category</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              Create a resource category with duration limits and an icon.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-name" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                Category Name
              </Label>
              <Input
                id="category-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Biosafety cabinets"
                required
                minLength={2}
                maxLength={80}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="category-max-minutes" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                  Longest booking
                </Label>
                {liveHint && (
                  <span className="text-xs font-mono font-semibold text-[#6cd8cb] tabular-nums">
                    {liveHint}
                  </span>
                )}
              </div>
              <Input
                id="category-max-minutes"
                name="maxBookingMinutes"
                type="number"
                step="15"
                min="15"
                max="10080"
                value={maxMinutes}
                onChange={(e) => setMaxMinutes(e.target.value)}
                required
              />
              <p className="text-xs font-mono text-[#94a3b8]">
                Enter duration in minutes (multiples of 15, up to 7 days).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category-icon" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                Icon glyph
              </Label>
              <Select value={iconKey} onValueChange={(val) => setIconKey(val as CategoryIconKey)}>
                <SelectTrigger id="category-icon" className="w-full bg-[#060e1d] border-[#334155] text-white">
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent className="bg-[#18202f] border-[#334155] text-white">
                  {CATEGORY_ICON_KEYS.map((key) => (
                    <SelectItem key={key} value={key} className="hover:bg-[#222a3a] focus:bg-[#222a3a]">
                      <div className="flex items-center gap-2">
                        <CategoryIcon
                          iconKey={key}
                          className="size-6 rounded"
                          iconClassName="size-3.5"
                        />
                        <span className="font-mono text-xs">{CATEGORY_ICON_LABELS[key]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {isPending ? "Adding..." : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
