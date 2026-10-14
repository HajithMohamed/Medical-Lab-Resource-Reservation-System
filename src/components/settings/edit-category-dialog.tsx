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
import { updateCategoryAction, type ActionResult } from "@/actions/settings";
import type { CategoryWithCounts } from "@/services/settings";

interface EditCategoryDialogProps {
  category: CategoryWithCounts;
  trigger?: React.ReactNode;
}

export function EditCategoryDialog({ category, trigger }: EditCategoryDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(category.name);
  const [maxMinutes, setMaxMinutes] = React.useState(String(category.maxBookingMinutes));
  const [iconKey, setIconKey] = React.useState<CategoryIconKey>(
    (category.iconKey as CategoryIconKey) || "other",
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(category.name);
      setMaxMinutes(String(category.maxBookingMinutes));
      setIconKey((category.iconKey as CategoryIconKey) || "other");
      setError(null);
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

    const result: ActionResult = await updateCategoryAction(category.id, null, formData);
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
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>
              Configure duration limits and icon for this resource category.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`edit-category-name-${category.id}`}>Name</Label>
              <Input
                id={`edit-category-name-${category.id}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Biosafety cabinets"
                required
                minLength={2}
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor={`edit-category-max-${category.id}`}>Longest booking</Label>
                {liveHint && (
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {liveHint}
                  </span>
                )}
              </div>
              <Input
                id={`edit-category-max-${category.id}`}
                name="maxBookingMinutes"
                type="number"
                step="15"
                min="15"
                max="10080"
                value={maxMinutes}
                onChange={(e) => setMaxMinutes(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter duration in minutes (multiples of 15, up to 7 days).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`edit-category-icon-${category.id}`}>Icon</Label>
              <Select value={iconKey} onValueChange={(val) => setIconKey(val as CategoryIconKey)}>
                <SelectTrigger id={`edit-category-icon-${category.id}`} className="w-full">
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ICON_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon
                          iconKey={key}
                          className="size-6 rounded"
                          iconClassName="size-3.5"
                        />
                        <span>{CATEGORY_ICON_LABELS[key]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
              Associated with{" "}
              <span className="font-semibold text-foreground">{category._count.resources}</span>{" "}
              resources.
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
