"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createResourceAction, type ResourceActionResult } from "@/actions/resources";
import type { Role } from "@/generated/prisma/client";

interface ResourceCreateDialogProps {
  actorRole: Role;
  actorSiteId: string | null;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
  trigger?: React.ReactNode;
}

export function ResourceCreateDialog({
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
  trigger,
}: ResourceCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const isManager = actorRole === "MANAGER";
  const defaultSiteId = isManager ? (actorSiteId ?? "") : (sites[0]?.id ?? "");

  const [name, setName] = React.useState("");
  const [siteId, setSiteId] = React.useState(defaultSiteId);
  const [categoryId, setCategoryId] = React.useState(categories[0]?.id ?? "");
  const [sectionId, setSectionId] = React.useState(sections[0]?.id ?? "");
  const [location, setLocation] = React.useState("");
  const [capacity, setCapacity] = React.useState("");

  const resetForm = () => {
    setName("");
    setSiteId(defaultSiteId);
    setCategoryId(categories[0]?.id ?? "");
    setSectionId(sections[0]?.id ?? "");
    setLocation("");
    setCapacity("");
    setError(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      resetForm();
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isRoom = selectedCategory?.iconKey === "room";
  const currentSiteName =
    sites.find((s) => s.id === (isManager ? actorSiteId : siteId))?.name ?? "Assigned site";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("name", name.trim());
    formData.set("siteId", isManager ? (actorSiteId ?? siteId) : siteId);
    formData.set("categoryId", categoryId);
    formData.set("sectionId", sectionId);
    if (location.trim()) {
      formData.set("location", location.trim());
    }
    if (capacity.trim()) {
      formData.set("capacity", capacity.trim());
    }

    const result: ResourceActionResult = await createResourceAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to add resource.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? "Resource added");
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button variant="default" className="gap-2 font-semibold">
            <Plus className="size-4" />
            <span>Add resource</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
            <DialogDescription>
              Register an instrument, biosafety cabinet, room or van into the network.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3.5">
            {/* Resource Name */}
            <div className="space-y-1.5">
              <Label htmlFor="create-resource-name">Resource name</Label>
              <Input
                id="create-resource-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Real-time PCR machine 1"
                required
                minLength={2}
                maxLength={80}
                disabled={isPending}
              />
              {fieldErrors.name && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Laboratory Site */}
            <div className="space-y-1.5">
              <Label htmlFor="create-resource-site">Laboratory site</Label>
              {isManager ? (
                <div>
                  <Input
                    id="create-resource-site"
                    value={currentSiteName}
                    disabled
                    className="bg-muted text-muted-foreground"
                  />
                  <input type="hidden" name="siteId" value={actorSiteId ?? ""} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Site managers may only add resources for their assigned laboratory.
                  </p>
                </div>
              ) : (
                <select
                  id="create-resource-site"
                  name="siteId"
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  disabled={isPending}
                  required
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {fieldErrors.siteId && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.siteId[0]}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="create-resource-category">Category</Label>
              <select
                id="create-resource-category"
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isPending}
                required
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.categoryId[0]}</p>
              )}
            </div>

            {/* Section */}
            <div className="space-y-1.5">
              <Label htmlFor="create-resource-section">Owning section</Label>
              <select
                id="create-resource-section"
                name="sectionId"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={isPending}
                required
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.sectionId && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.sectionId[0]}</p>
              )}
            </div>

            {/* Location (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="create-resource-location">
                Location <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="create-resource-location"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Molecular lab, room 2.14"
                maxLength={120}
                disabled={isPending}
              />
              {fieldErrors.location && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.location[0]}</p>
              )}
            </div>

            {/* Capacity (optional or room) */}
            <div className="space-y-1.5">
              <Label htmlFor="create-resource-capacity">
                {isRoom ? "Seat capacity" : "Capacity"}{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="create-resource-capacity"
                name="capacity"
                type="number"
                min={1}
                max={500}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder={isRoom ? "e.g. 12" : "Leave blank if not applicable"}
                disabled={isPending}
              />
              {fieldErrors.capacity && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.capacity[0]}</p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="font-semibold">
              {isPending ? "Adding..." : "Add resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
