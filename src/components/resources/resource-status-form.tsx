"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { changeResourceStatusAction } from "@/actions/resources";
import type { ResourceStatus } from "@/generated/prisma/client";

interface ResourceStatusFormProps {
  resource: {
    id: string;
    name: string;
    status: ResourceStatus;
    site: { name: string };
  };
  upcomingBookingsCount: number;
}

export function ResourceStatusForm({ resource, upcomingBookingsCount }: ResourceStatusFormProps) {
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] = React.useState<ResourceStatus>(resource.status);
  const [reason, setReason] = React.useState("");
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isChangingToDown = selectedStatus === "OUT_OF_SERVICE" || selectedStatus === "RETIRED";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("status", selectedStatus);
    if (isChangingToDown) {
      formData.set("reason", reason.trim());
    }

    const result = await changeResourceStatusAction(resource.id, null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to update resource status.");
      return;
    }

    toast.success(result.message ?? "Status updated");
    router.push(`/resources/${resource.id}`);
    router.refresh();
  };

  const getSubmitLabel = () => {
    if (isPending) return "Updating...";
    switch (selectedStatus) {
      case "ACTIVE":
        return "Mark active";
      case "OUT_OF_SERVICE":
        return "Mark out of service";
      case "RETIRED":
        return "Retire resource";
    }
  };

  const isDestructive = selectedStatus === "OUT_OF_SERVICE" || selectedStatus === "RETIRED";

  return (
    <Card className="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Change status: {resource.name}</CardTitle>
          <CardDescription>
            Control resource availability across the {resource.site.name} laboratory.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Status Options */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Choose new status</Label>

            <div className="grid gap-3">
              {/* Active */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedStatus === "ACTIVE"
                    ? "border-primary bg-secondary/30 ring-1 ring-primary"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="ACTIVE"
                  checked={selectedStatus === "ACTIVE"}
                  onChange={() => setSelectedStatus("ACTIVE")}
                  className="mt-1 size-4 text-primary focus:ring-ring"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-pass shrink-0" />
                    <span className="font-bold text-sm text-foreground">Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Can be booked.</p>
                </div>
              </label>

              {/* Out of service */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedStatus === "OUT_OF_SERVICE"
                    ? "border-destructive bg-tag-red-bg/40 ring-1 ring-destructive"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="OUT_OF_SERVICE"
                  checked={selectedStatus === "OUT_OF_SERVICE"}
                  onChange={() => setSelectedStatus("OUT_OF_SERVICE")}
                  className="mt-1 size-4 text-destructive focus:ring-destructive"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-destructive shrink-0" />
                    <span className="font-bold text-sm text-foreground">Out of service</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cannot be booked until it is set back to active. Upcoming bookings are
                    cancelled.
                  </p>
                </div>
              </label>

              {/* Retired */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedStatus === "RETIRED"
                    ? "border-foreground bg-muted ring-1 ring-foreground"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="RETIRED"
                  checked={selectedStatus === "RETIRED"}
                  onChange={() => setSelectedStatus("RETIRED")}
                  className="mt-1 size-4 text-foreground focus:ring-ring"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted-foreground shrink-0" />
                    <span className="font-bold text-sm text-foreground">Retired</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Removed for good. History is kept.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Cancellation Notice and Reason for OUT_OF_SERVICE or RETIRED */}
          {isChangingToDown && (
            <div className="space-y-4 pt-1">
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-200">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="font-bold text-sm">
                  {upcomingBookingsCount === 1
                    ? "1 upcoming booking will be cancelled"
                    : `${upcomingBookingsCount} upcoming bookings will be cancelled`}
                </AlertTitle>
                <AlertDescription className="text-xs leading-relaxed mt-1">
                  {upcomingBookingsCount} upcoming booking{upcomingBookingsCount === 1 ? "" : "s"}{" "}
                  will be cancelled and each person will see your reason in My bookings. If you know
                  when it will be working again, use{" "}
                  <Link
                    href={`/maintenance/new?resourceId=${resource.id}`}
                    className="font-bold underline hover:text-amber-900"
                  >
                    Block time
                  </Link>{" "}
                  instead.
                </AlertDescription>
              </Alert>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="status-reason" className="text-sm font-semibold">
                    Reason for status change
                  </Label>
                  <span className="text-xs text-muted-foreground">3 to 200 characters</span>
                </div>
                <Textarea
                  id="status-reason"
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    selectedStatus === "OUT_OF_SERVICE"
                      ? "e.g. Laser power sensor malfunction; engineer dispatched"
                      : "e.g. Decommissioned and replaced by new sequencer"
                  }
                  required
                  minLength={3}
                  maxLength={200}
                  disabled={isPending}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-2">
          <Button asChild variant="ghost" type="button" disabled={isPending}>
            <Link href={`/resources/${resource.id}`} className="text-muted-foreground">
              Keep as it is
            </Link>
          </Button>

          <Button
            type="submit"
            disabled={isPending || (isChangingToDown && reason.trim().length < 3)}
            variant={isDestructive ? "destructive" : "default"}
          >
            {getSubmitLabel()}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
