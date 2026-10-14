"use client";

import * as React from "react";
import { AlertCircle, Clock } from "lucide-react";
import { MarkDoneDialog } from "./mark-done-dialog";
import { MarkNotDoneDialog } from "./mark-not-done-dialog";
import { BlockTimeButton } from "./block-time-button";
import type { TrackerStatus } from "@/lib/equipment-status";
import { formatEquipmentDay } from "@/lib/equipment-status";
import type { ResourceStatus } from "@/generated/prisma/client";
import type { UserLike } from "@/lib/permissions";

export interface DueDayBannerProps {
  actor: UserLike;
  actorName?: string;
  resource: {
    id: string;
    name: string;
    siteId: string;
    status: ResourceStatus;
    calibrationIntervalDays?: number | null;
    maintenanceIntervalDays?: number | null;
    nextCalibrationDueOn?: Date | string | null;
    nextMaintenanceDueOn?: Date | string | null;
  };
  calibrationStatus: TrackerStatus;
  maintenanceStatus: TrackerStatus;
  affectedBookingsCount?: number;
  lastNotDoneCalibration?: {
    notes: string;
    plannedDate: string | null;
  } | null;
  lastNotDoneMaintenance?: {
    notes: string;
    plannedDate: string | null;
  } | null;
}

export function DueDayBanner({
  actor,
  actorName = "",
  resource,
  calibrationStatus,
  maintenanceStatus,
  affectedBookingsCount = 0,
  lastNotDoneCalibration,
  lastNotDoneMaintenance,
}: DueDayBannerProps) {
  const isManagerOrAdmin = actor.role === "MANAGER" || actor.role === "ADMIN";
  const canManageSite =
    actor.role === "ADMIN" || (actor.role === "MANAGER" && actor.siteId === resource.siteId);

  if (!isManagerOrAdmin || !canManageSite) {
    return null;
  }

  const calibNeedsAction = calibrationStatus === "DUE_TODAY" || calibrationStatus === "OVERDUE";
  const maintNeedsAction = maintenanceStatus === "DUE_TODAY" || maintenanceStatus === "OVERDUE";

  if (!calibNeedsAction && !maintNeedsAction) {
    return null;
  }

  const calibDueStr = resource.nextCalibrationDueOn
    ? typeof resource.nextCalibrationDueOn === "string"
      ? resource.nextCalibrationDueOn
      : resource.nextCalibrationDueOn.toISOString().split("T")[0]
    : "";

  const maintDueStr = resource.nextMaintenanceDueOn
    ? typeof resource.nextMaintenanceDueOn === "string"
      ? resource.nextMaintenanceDueOn
      : resource.nextMaintenanceDueOn.toISOString().split("T")[0]
    : "";

  return (
    <div className="space-y-3">
      {/* Calibration Banner */}
      {calibNeedsAction && calibDueStr && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            calibrationStatus === "OVERDUE"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              {calibrationStatus === "OVERDUE" ? (
                <AlertCircle className="size-4 text-rose-400 shrink-0" />
              ) : (
                <Clock className="size-4 text-amber-300 shrink-0" />
              )}
              <span className="text-white text-sm">
                {calibrationStatus === "OVERDUE"
                  ? `Calibration overdue since ${formatEquipmentDay(calibDueStr)}`
                  : "Calibration due today"}
              </span>
            </div>
            {lastNotDoneCalibration && (
              <p className="text-xs text-[#94a3b8] pl-6">
                Not done recorded: &ldquo;{lastNotDoneCalibration.notes}&rdquo;
                {lastNotDoneCalibration.plannedDate &&
                  ` &bull; Planned for ${formatEquipmentDay(lastNotDoneCalibration.plannedDate)}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pl-6 sm:pl-0">
            <MarkDoneDialog
              resourceId={resource.id}
              resourceName={resource.name}
              resourceStatus={resource.status}
              tracker="calibration"
              dueOn={calibDueStr}
              intervalDays={resource.calibrationIntervalDays}
              affectedBookingsCount={affectedBookingsCount}
              actorName={actorName}
            />
            <MarkNotDoneDialog
              resourceId={resource.id}
              resourceName={resource.name}
              tracker="calibration"
              dueOn={calibDueStr}
              affectedBookingsCount={affectedBookingsCount}
            />
            <BlockTimeButton
              actor={actor}
              resource={{ id: resource.id, siteId: resource.siteId }}
              reason="Calibration"
            />
          </div>
        </div>
      )}

      {/* Maintenance Banner */}
      {maintNeedsAction && maintDueStr && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            maintenanceStatus === "OVERDUE"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-200"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              {maintenanceStatus === "OVERDUE" ? (
                <AlertCircle className="size-4 text-rose-400 shrink-0" />
              ) : (
                <Clock className="size-4 text-amber-300 shrink-0" />
              )}
              <span className="text-white text-sm">
                {maintenanceStatus === "OVERDUE"
                  ? `Service overdue since ${formatEquipmentDay(maintDueStr)}`
                  : "Service due today"}
              </span>
            </div>
            {lastNotDoneMaintenance && (
              <p className="text-xs text-[#94a3b8] pl-6">
                Not done recorded: &ldquo;{lastNotDoneMaintenance.notes}&rdquo;
                {lastNotDoneMaintenance.plannedDate &&
                  ` &bull; Planned for ${formatEquipmentDay(lastNotDoneMaintenance.plannedDate)}`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pl-6 sm:pl-0">
            <MarkDoneDialog
              resourceId={resource.id}
              resourceName={resource.name}
              resourceStatus={resource.status}
              tracker="maintenance"
              dueOn={maintDueStr}
              intervalDays={resource.maintenanceIntervalDays}
              affectedBookingsCount={affectedBookingsCount}
              actorName={actorName}
            />
            <MarkNotDoneDialog
              resourceId={resource.id}
              resourceName={resource.name}
              tracker="maintenance"
              dueOn={maintDueStr}
              affectedBookingsCount={affectedBookingsCount}
            />
            <BlockTimeButton
              actor={actor}
              resource={{ id: resource.id, siteId: resource.siteId }}
              reason="Service"
            />
          </div>
        </div>
      )}
    </div>
  );
}
