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
          <Button
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-mint text-xs font-bold text-navy hover:text-teal border border-card-edge shadow-2xs transition-all cursor-pointer"
          >
            <Pencil className="size-3.5 text-teal" />
            <span>Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-card border-card-edge shadow-v4 rounded-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-navy">Edit category</DialogTitle>
            <DialogDescription className="text-xs text-muted">
              Configure duration limits and icon for this resource category.
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
                htmlFor={`edit-category-name-${category.id}`}
                className="text-xs font-bold uppercase tracking-wider text-navy/80"
              >
                Category Name
              </Label>
              <Input
                id={`edit-category-name-${category.id}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Biosafety cabinets"
                required
                minLength={2}
                maxLength={80}
                className="bg-card border-card-edge text-navy font-semibold text-xs rounded-xl focus:border-teal"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={`edit-category-max-${category.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-navy/80"
                >
                  Longest booking
                </Label>
                {liveHint && (
                  <span className="text-xs font-bold text-teal tabular-nums">{liveHint}</span>
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
                className="bg-card border-card-edge text-navy font-semibold text-xs rounded-xl focus:border-teal"
              />
              <p className="text-[11.5px] text-slate-600 font-medium">
                Enter duration in minutes (multiples of 15, up to 7 days).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor={`edit-category-icon-${category.id}`}
                className="text-xs font-bold uppercase tracking-wider text-navy/80"
              >
                Icon glyph
              </Label>
              <Select value={iconKey} onValueChange={(val) => setIconKey(val as CategoryIconKey)}>
                <SelectTrigger
                  id={`edit-category-icon-${category.id}`}
                  className="w-full bg-card border-card-edge text-navy font-semibold text-xs rounded-xl"
                >
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent className="bg-card border-card-edge text-navy">
                  {CATEGORY_ICON_KEYS.map((key) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="hover:bg-mint focus:bg-mint font-semibold text-xs text-navy cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <CategoryIcon
                          iconKey={key}
                          className="size-6 rounded"
                          iconClassName="size-3.5"
                        />
                        <span className="text-xs font-medium text-navy">
                          {CATEGORY_ICON_LABELS[key]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Telemetry Stats Callout */}
            <div className="p-3.5 bg-canvas border border-card-edge rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-teal font-bold">ℹ</span>
                <span className="text-xs text-slate-700 font-medium">
                  Associated with{" "}
                  <strong className="text-navy font-bold">
                    {category._count.resources} resources
                  </strong>
                  .
                </span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-soft text-teal-deep border border-teal-line">
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
              className="border-card-edge text-navy hover:bg-mint text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-teal hover:bg-teal-deep text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
