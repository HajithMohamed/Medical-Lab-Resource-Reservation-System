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
import { updateSectionAction, deleteSectionAction } from "@/actions/settings";
import type { SectionWithCounts } from "@/services/settings";

interface SectionEditFormProps {
  section: SectionWithCounts;
}

export function SectionEditForm({ section }: SectionEditFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(section.name);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);

    const res = await updateSectionAction(section.id, null, formData);
    setIsPending(false);

    if (!res.ok) {
      setError(res.error ?? "Failed to save changes.");
      return;
    }

    toast.success(res.message ?? "Changes saved");
  };

  const handleDelete = async () => {
    const res = await deleteSectionAction(section.id);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }

    toast.success(res.message ?? "Section deleted");
    router.push("/settings/sections");
    return { ok: true };
  };

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleUpdate}>
        <CardHeader>
          <CardTitle>Section details</CardTitle>
          <CardDescription>Update the name for this laboratory section.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-section-name">Name</Label>
            <Input
              id="edit-section-name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Clinical Biochemistry"
              required
              minLength={2}
              maxLength={80}
            />
          </div>

          <div className="pt-2 text-sm text-muted-foreground">
            Currently associated with{" "}
            <span className="font-medium text-foreground">{section._count.resources}</span>{" "}
            resources and{" "}
            <span className="font-medium text-foreground">{section._count.users}</span> users.
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border pt-4">
          <ConfirmAction
            trigger={
              <Button type="button" variant="destructive">
                Delete
              </Button>
            }
            title="Delete section"
            description={`Are you sure you want to delete "${section.name}"? This action cannot be undone.`}
            confirmLabel="Delete section"
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
