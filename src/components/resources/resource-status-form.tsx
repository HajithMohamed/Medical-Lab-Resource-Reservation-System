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
                    ? "border-teal bg-mint/40 ring-1 ring-teal"
                    : "border-card-edge bg-canvas hover:bg-card"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="ACTIVE"
                  checked={selectedStatus === "ACTIVE"}
                  onChange={() => setSelectedStatus("ACTIVE")}
                  className="mt-1 size-4 accent-teal"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-teal shrink-0" />
                    <span className="font-bold text-sm text-navy">Active</span>
                  </div>
                  <p className="text-xs text-muted">Can be booked.</p>
                </div>
              </label>

              {/* Out of service */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedStatus === "OUT_OF_SERVICE"
                    ? "border-red bg-red-soft ring-1 ring-red"
                    : "border-card-edge bg-canvas hover:bg-card"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="OUT_OF_SERVICE"
                  checked={selectedStatus === "OUT_OF_SERVICE"}
                  onChange={() => setSelectedStatus("OUT_OF_SERVICE")}
                  className="mt-1 size-4 accent-red"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-red shrink-0" />
                    <span className="font-bold text-sm text-navy">Out of service</span>
                  </div>
                  <p className="text-xs text-muted">
                    Cannot be booked until it is set back to active. Upcoming bookings are
                    cancelled.
                  </p>
                </div>
              </label>

              {/* Retired */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  selectedStatus === "RETIRED"
                    ? "border-muted bg-canvas ring-1 ring-muted"
                    : "border-card-edge bg-canvas hover:bg-card"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value="RETIRED"
                  checked={selectedStatus === "RETIRED"}
                  onChange={() => setSelectedStatus("RETIRED")}
                  className="mt-1 size-4 accent-muted"
                />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted shrink-0" />
                    <span className="font-bold text-sm text-navy">Retired</span>
                  </div>
                  <p className="text-xs text-muted">Removed for good. History is kept.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Cancellation Notice and Reason for OUT_OF_SERVICE or RETIRED */}
          {isChangingToDown && (
            <div className="space-y-4 pt-1">
              <Alert className="border-amber-line bg-amber-soft text-amber">
                <AlertTriangle className="size-4 text-amber-strong" />
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
                    href={`/maintenance/new?resourceId=${resource.id}&returnTo=${encodeURIComponent(`/resources/${resource.id}`)}`}
                    className="font-bold underline text-amber-strong"
                  >
                    Block time
                  </Link>{" "}
                  instead.
                </AlertDescription>
              </Alert>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="status-reason" className="text-sm font-semibold text-navy">
                    Reason for status change
                  </Label>
                  <span className="text-xs text-muted">3 to 200 characters</span>
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
            <Link
              href={`/resources/${resource.id}`}
              className="text-muted hover:text-navy font-bold text-xs"
            >
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
