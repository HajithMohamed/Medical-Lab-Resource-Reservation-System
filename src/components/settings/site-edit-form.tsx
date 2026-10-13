"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { ConfirmAction } from "@/components/confirm-action";
import { updateSiteAction, deleteSiteAction } from "@/actions/settings";
import type { SiteWithCounts } from "@/services/settings";

interface SiteEditFormProps {
  site: SiteWithCounts;
}

export function SiteEditForm({ site }: SiteEditFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(site.name);
  const [address, setAddress] = React.useState(site.address ?? "");
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("address", address);

    const res = await updateSiteAction(site.id, null, formData);
    setIsPending(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to save changes.");
      return;
    }

    toast.success(res.message ?? "Changes saved");
  };

  const handleDelete = async () => {
    const res = await deleteSiteAction(site.id);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    toast.success(res.message ?? "Site deleted");
    router.push("/settings/sites");
    return { ok: true };
  };

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleUpdate}>
        <CardHeader>
          <CardTitle>Site details</CardTitle>
          <CardDescription>Update the name and address for this laboratory site.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-site-name">Name</Label>
            <Input
              id="edit-site-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Laboratory, Colombo"
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-site-address">
              Address <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="edit-site-address"
              name="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Colombo 07"
              maxLength={200}
            />
          </div>

          <div className="pt-2 text-sm text-muted-foreground">
            Currently associated with{" "}
            <span className="font-medium text-foreground">{site._count.resources}</span> resources
            and <span className="font-medium text-foreground">{site._count.users}</span> users.
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <ConfirmAction
            trigger={
              <Button type="button" variant="destructive">
                Delete
              </Button>
            }
            title="Delete site"
            description={`Are you sure you want to delete "${site.name}"? This action cannot be undone.`}
            confirmLabel="Delete site"
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
