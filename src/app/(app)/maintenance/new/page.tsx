import * as React from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageMaintenance } from "@/lib/permissions";
import {
  labToday,
  labTimeString,
  startOfCurrentSlot,
  addLabDays,
  getLabTimeZone,
} from "@/lib/time";
import { listMaintenanceResources } from "@/services/maintenance";
import { MaintenanceForm } from "@/components/maintenance/maintenance-form";

export const metadata = {
  title: "Block Time | BenchBook",
  description: "Schedule maintenance or report breakdowns for medical laboratory resources.",
};

interface NewMaintenancePageProps {
  searchParams?: Promise<{
    resourceId?: string;
    siteId?: string;
    breakdown?: string;
    reason?: string;
    returnTo?: string;
  }>;
}

export default async function NewMaintenancePage({ searchParams }: NewMaintenancePageProps) {
  const actor = await requireRole("MANAGER", "ADMIN");
  const resolvedParams = searchParams ? await searchParams : {};

  const resourceId = resolvedParams.resourceId;
  const isBreakdown = resolvedParams.breakdown === "1";
  const defaultReason = resolvedParams.reason;
  const zone = getLabTimeZone();

  // If a specific resourceId was provided in query, verify authorization
  if (resourceId) {
    const resource = await db.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, siteId: true, status: true },
    });

    if (!resource || !canManageMaintenance(actor, { siteId: resource.siteId })) {
      notFound();
    }
  }

  // Load available resources the actor may manage
  const resources = await listMaintenanceResources(actor);

  // Calculate default dates and times
  const now = new Date();
  const currentSlot = startOfCurrentSlot(now, zone);
  const todayStr = labToday(zone, now);
  const currentTimeStr = labTimeString(currentSlot, zone);

  let defaultStartDate = todayStr;
  let defaultStartTime = currentTimeStr;
  let defaultEndDate = todayStr;
  let defaultEndTime = currentTimeStr;

  if (isBreakdown) {
    // Breakdown: starts now, ends same time tomorrow
    defaultStartDate = todayStr;
    defaultStartTime = currentTimeStr;
    defaultEndDate = addLabDays(todayStr, 1, zone);
    defaultEndTime = currentTimeStr;
  } else {
    // Normal maintenance block: default starts at next hour or current slot, ends 2 hours later
    defaultStartDate = todayStr;
    defaultStartTime = currentTimeStr;
    // 2 hours later
    const twoHoursLater = new Date(currentSlot.getTime() + 2 * 60 * 60 * 1000);
    defaultEndDate = labToday(zone, twoHoursLater);
    defaultEndTime = labTimeString(twoHoursLater, zone);
  }

  const rawReturnTo = resolvedParams.returnTo;
  const safeReturnTo =
    rawReturnTo && rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/equipment?tab=blocked";

  return (
    <div className="py-4">
      <MaintenanceForm
        resources={resources}
        defaultResourceId={resourceId}
        defaultStartDate={defaultStartDate}
        defaultStartTime={defaultStartTime}
        defaultEndDate={defaultEndDate}
        defaultEndTime={defaultEndTime}
        defaultReason={defaultReason}
        isBreakdown={isBreakdown}
        isAdmin={actor.role === "ADMIN"}
        returnTo={safeReturnTo}
      />
    </div>
  );
}
