"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Info } from "lucide-react";
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

  const defaultSiteId = isManager && actorSiteId ? actorSiteId : sites[0]?.id ?? "";
  const defaultCategoryId = categories[0]?.id ?? "";
  const defaultSectionId = sections[0]?.id ?? "";

  const [name, setName] = React.useState("");
  const [siteId, setSiteId] = React.useState(defaultSiteId);
  const [categoryId, setCategoryId] = React.useState(defaultCategoryId);
  const [sectionId, setSectionId] = React.useState(defaultSectionId);
  const [location, setLocation] = React.useState("");
  const [capacity, setCapacity] = React.useState("");

  const resetForm = () => {
    setName("");
    setSiteId(isManager && actorSiteId ? actorSiteId : sites[0]?.id ?? "");
    setCategoryId(categories[0]?.id ?? "");
    setSectionId(sections[0]?.id ?? "");
    setLocation("");
    setCapacity("");
    setError(null);
    setFieldErrors({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isRoom = selectedCategory?.iconKey === "room";
  const currentSiteName =
    sites.find((s) => s.id === (isManager ? actorSiteId : siteId))?.name ?? "Assigned site";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsPending(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("siteId", isManager && actorSiteId ? actorSiteId : siteId);
    formData.append("categoryId", categoryId);
    formData.append("sectionId", sectionId);
    if (location.trim()) {
      formData.append("location", location.trim());
    }
    if (capacity.trim()) {
      formData.append("capacity", capacity.trim());
    }

    const result: ResourceActionResult = await createResourceAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to create resource.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? "Resource registered successfully");
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
          <Button variant="default" className="gap-2 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-xs">
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
              <Label htmlFor="create-resource-name" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">Resource name</Label>
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
              <Label htmlFor="create-resource-site" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">Laboratory site</Label>
              {isManager ? (
                <div>
                  <Input
                    id="create-resource-site"
                    value={currentSiteName}
                    disabled
                    className="bg-[#141c2b] text-[#94a3b8]"
                  />
                  <input type="hidden" name="siteId" value={actorSiteId ?? ""} />
                  <p className="text-xs text-[#94a3b8] mt-1 font-mono">
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
                  className="h-10 w-full rounded-md border border-[#334155] bg-[#060e1d] px-3 text-sm text-white focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
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
              <Label htmlFor="create-resource-category" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">Category</Label>
              <select
                id="create-resource-category"
                name="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isPending}
                required
                className="h-10 w-full rounded-md border border-[#334155] bg-[#060e1d] px-3 text-sm text-white focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
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
              <Label htmlFor="create-resource-section" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">Owning section</Label>
              <select
                id="create-resource-section"
                name="sectionId"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                disabled={isPending}
                required
                className="h-10 w-full rounded-md border border-[#334155] bg-[#060e1d] px-3 text-sm text-white focus:border-[#6cd8cb] focus:outline-none cursor-pointer transition-colors"
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
              <Label htmlFor="create-resource-location" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                Location <span className="text-[#94a3b8] font-normal font-mono">(optional)</span>
              </Label>
              <Input
                id="create-resource-location"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Lab 3B, Bench 4"
                maxLength={120}
                disabled={isPending}
              />
              {fieldErrors.location && (
                <p className="text-xs font-medium text-destructive">{fieldErrors.location[0]}</p>
              )}
            </div>

            {/* Capacity (rooms only) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="create-resource-capacity" className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]">
                  Capacity / seats{" "}
                  <span className="text-[#94a3b8] font-normal font-mono">
                    {isRoom ? "(recommended for rooms)" : "(optional)"}
                  </span>
                </Label>
                {isRoom && (
                  <span className="text-xs font-mono text-[#6cd8cb] flex items-center gap-1">
                    <Info className="size-3" /> Room resource
                  </span>
                )}
              </div>
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
              {isPending ? "Adding..." : "Add resource"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
