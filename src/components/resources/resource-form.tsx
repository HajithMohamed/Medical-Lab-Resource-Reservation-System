"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createResourceAction,
  updateResourceAction,
  type ResourceActionResult,
} from "@/actions/resources";
import type { Role } from "@/generated/prisma/client";

interface ResourceFormProps {
  initialData?: {
    id: string;
    name: string;
    siteId: string;
    categoryId: string;
    sectionId: string;
    location: string | null;
    capacity: number | null;
  };
  actorRole: Role;
  actorSiteId: string | null;
  sites: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections: Array<{ id: string; name: string }>;
  isEdit?: boolean;
}

export function ResourceForm({
  initialData,
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
  isEdit = false,
}: ResourceFormProps) {
  const router = useRouter();

  const isManager = actorRole === "MANAGER";
  const defaultSiteId =
    initialData?.siteId ?? (isManager ? (actorSiteId ?? "") : (sites[0]?.id ?? ""));

  const [name, setName] = React.useState(initialData?.name ?? "");
  const [siteId, setSiteId] = React.useState<string>(defaultSiteId);
  const [categoryId, setCategoryId] = React.useState<string>(
    initialData?.categoryId ?? categories[0]?.id ?? "",
  );
  const [sectionId, setSectionId] = React.useState<string>(
    initialData?.sectionId ?? sections[0]?.id ?? "",
  );
  const [location, setLocation] = React.useState(initialData?.location ?? "");
  const [capacity, setCapacity] = React.useState<string>(
    initialData?.capacity !== null && initialData?.capacity !== undefined
      ? String(initialData.capacity)
      : "",
  );

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isRoom = selectedCategory?.iconKey === "room";

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

    let result: ResourceActionResult;

    if (isEdit && initialData?.id) {
      result = await updateResourceAction(initialData.id, null, formData);
    } else {
      result = await createResourceAction(null, formData);
    }

    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save resource.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    toast.success(result.message ?? (isEdit ? "Changes saved" : "Resource added"));

    if (isEdit && initialData?.id) {
      router.push(`/resources/${initialData.id}`);
    } else if (result.resourceId) {
      router.push(`/resources/${result.resourceId}`);
    } else {
      router.push("/resources");
    }
    router.refresh();
  };

  const currentSiteName =
    sites.find((s) => s.id === (isManager ? actorSiteId : siteId))?.name ?? "Assigned site";

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            {isEdit ? `Edit ${initialData?.name ?? "resource"}` : "Add resource"}
          </CardTitle>
          <CardDescription>
            {isEdit
              ? "Update equipment specifications, location or assigned department."
              : "Register an instrument, biosafety cabinet, room or van into the network."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Resource Name */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-name">Resource name</Label>
            <Input
              id="resource-name"
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

          {/* Site selection: Managers are locked to their own site */}
          <div className="space-y-1.5">
            <Label htmlFor="resource-site">Laboratory site</Label>
            {isManager ? (
              <div>
                <Input
                  id="resource-site"
                  value={currentSiteName}
                  disabled
                  className="bg-muted text-muted-foreground"
                />
                <input type="hidden" name="siteId" value={actorSiteId ?? ""} />
                <p className="text-xs text-muted-foreground mt-1">
                  Site managers may only manage resources for their assigned laboratory.
                </p>
              </div>
            ) : (
              <select
                id="resource-site"
                name="siteId"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={isPending}
                required
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
            <Label htmlFor="resource-category">Category</Label>
            <select
              id="resource-category"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={isPending}
              required
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
            <Label htmlFor="resource-section">Owning section</Label>
            <select
              id="resource-section"
              name="sectionId"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={isPending}
              required
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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

          {/* Location */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="resource-location">Location</Label>
              <span className="text-xs text-muted-foreground">Optional, up to 120 characters</span>
            </div>
            <Input
              id="resource-location"
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

          {/* Capacity (Seats for rooms) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="resource-capacity">Capacity</Label>
              <span className="text-xs text-muted-foreground">
                {isRoom ? "Number of seats (1-500)" : "Optional, for rooms"}
              </span>
            </div>
            <Input
              id="resource-capacity"
              name="capacity"
              type="number"
              min={1}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Number of seats, for rooms"
              disabled={isPending}
            />
            {fieldErrors.capacity && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.capacity[0]}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-end gap-3 pt-2">
          <Button asChild variant="outline" type="button" disabled={isPending}>
            <Link href={isEdit && initialData?.id ? `/resources/${initialData.id}` : "/resources"}>
              Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEdit
                ? "Saving..."
                : "Adding..."
              : isEdit
                ? "Save changes"
                : "Add resource"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
