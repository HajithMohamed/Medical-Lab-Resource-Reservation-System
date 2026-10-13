"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmAction } from "@/components/confirm-action";
import {
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_LABELS,
  type CategoryIconKey,
} from "@/config/category-icons";
import { formatMinutes } from "@/lib/format";
import { updateCategoryAction, deleteCategoryAction } from "@/actions/settings";
import type { CategoryWithCounts } from "@/services/settings";

interface CategoryEditFormProps {
  category: CategoryWithCounts;
}

export function CategoryEditForm({ category }: CategoryEditFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(category.name);
  const [maxMinutes, setMaxMinutes] = React.useState(String(category.maxBookingMinutes));
  const [iconKey, setIconKey] = React.useState<CategoryIconKey>(
    (category.iconKey as CategoryIconKey) || "other",
  );
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const minutesNumber = Number(maxMinutes);
  const liveHint =
    !Number.isNaN(minutesNumber) && minutesNumber > 0 ? `= ${formatMinutes(minutesNumber)}` : "";

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("maxBookingMinutes", maxMinutes);
    formData.set("iconKey", iconKey);

    const res = await updateCategoryAction(category.id, null, formData);
    setIsPending(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to save changes.");
      return;
    }

    toast.success(res.message ?? "Changes saved");
  };

  const handleDelete = async () => {
    const res = await deleteCategoryAction(category.id);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    toast.success(res.message ?? "Category deleted");
    router.push("/settings/categories");
    return { ok: true };
  };

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleUpdate}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CategoryIcon iconKey={iconKey} className="size-10 rounded-lg" iconClassName="size-5" />
            <div>
              <CardTitle>Category details</CardTitle>
              <CardDescription>
                Configure duration rules and visual identity for this resource category.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-category-name">Name</Label>
            <Input
              id="edit-category-name"
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
              <Label htmlFor="edit-category-max-minutes">Longest booking</Label>
              {liveHint && (
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {liveHint}
                </span>
              )}
            </div>
            <Input
              id="edit-category-max-minutes"
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
            <Label htmlFor="edit-category-icon">Icon</Label>
            <Select value={iconKey} onValueChange={(val) => setIconKey(val as CategoryIconKey)}>
              <SelectTrigger id="edit-category-icon" className="w-full">
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

          <div className="pt-2 text-sm text-muted-foreground">
            Currently associated with{" "}
            <span className="font-medium text-foreground">{category._count.resources}</span>{" "}
            resources.
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <ConfirmAction
            trigger={
              <Button type="button" variant="destructive">
                Delete
              </Button>
            }
            title="Delete category"
            description={`Are you sure you want to delete "${category.name}"? This action cannot be undone.`}
            confirmLabel="Delete category"
            isDestructive
            action={handleDelete}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
