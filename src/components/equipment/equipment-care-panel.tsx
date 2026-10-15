"use client";

import * as React from "react";
import { format } from "date-fns";
import { ShieldCheck, FileText } from "lucide-react";
import { EquipmentStatusTag } from "./equipment-status-tag";
import { RecordEquipmentDialog } from "./record-equipment-dialog";
import { BlockTimeButton } from "./block-time-button";
import { equipmentPartsFor, equipmentLabelsFor } from "@/config/equipment";
import {
  formatEquipmentDay,
  formatEquipmentStatusText,
  type TrackerStatus,
} from "@/lib/equipment-status";
import { dbToDay } from "@/lib/equipment-dates";
import type { ResourceStatus } from "@/generated/prisma/client";
import type { EquipmentRecordItem } from "@/services/equipment";
import type { UserLike } from "@/lib/permissions";

export interface EquipmentCarePanelProps {
  actor: UserLike;
  actorName?: string;
  resource: {
    id: string;
    name: string;
    siteId: string;
    status: ResourceStatus;
    manufacturer?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    inServiceOn?: Date | null;
    expectedServiceLifeYears?: number | null;
    calibrationIntervalDays?: number | null;
    nextCalibrationDueOn?: Date | null;
    maintenanceIntervalDays?: number | null;
    nextMaintenanceDueOn?: Date | null;
    replacementReviewDueOn?: Date | null;
    calibrationStatus?: TrackerStatus;
    maintenanceStatus?: TrackerStatus;
    reviewStatus?: TrackerStatus;
    category: {
      iconKey: string;
      name: string;
    };
  };
  history: EquipmentRecordItem[];
  affectedBookingsCount?: number;
}

export function EquipmentCarePanel({
  actor,
  actorName = "",
  resource,
  history,
  affectedBookingsCount = 0,
}: EquipmentCarePanelProps) {
  const iconKey = resource.category.iconKey;
  const parts = equipmentPartsFor(iconKey);
  const labels = equipmentLabelsFor(iconKey);

  if (parts.length === 0) {
    return null;
  }

  const hasDetails = parts.includes("details");
  const hasCalibration = parts.includes("calibration");
  const hasMaintenance = parts.includes("maintenance");

  const canManage =
    actor.role === "ADMIN" || (actor.role === "MANAGER" && actor.siteId === resource.siteId);

  const calibDueStr = resource.nextCalibrationDueOn ? dbToDay(resource.nextCalibrationDueOn) : null;
  const maintDueStr = resource.nextMaintenanceDueOn ? dbToDay(resource.nextMaintenanceDueOn) : null;
  const reviewDueStr = resource.replacementReviewDueOn
    ? dbToDay(resource.replacementReviewDueOn)
    : null;

  const inServiceStr = resource.inServiceOn ? format(resource.inServiceOn, "d MMM yyyy") : null;

  return (
    <div className="space-y-6 rounded-2xl bg-card border border-card-edge p-6 shadow-v4 text-navy">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-edge pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-teal" />
            <h2 className="text-base font-bold text-navy tracking-tight">Equipment care</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Verification schedules, preventive servicing, and compliance audit trail.
          </p>
        </div>

        {/* Manager / Admin action buttons */}
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            {hasCalibration && (
              <RecordEquipmentDialog
                resourceId={resource.id}
                resourceName={resource.name}
                resourceStatus={resource.status}
                kindCategory="CALIBRATION"
                intervalDays={resource.calibrationIntervalDays}
                affectedBookingsCount={affectedBookingsCount}
                actorName={actorName}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-canvas text-xs font-bold text-navy border border-card-edge shadow-2xs transition-colors"
                  >
                    Record calibration
                  </button>
                }
              />
            )}

            {hasMaintenance && (
              <RecordEquipmentDialog
                resourceId={resource.id}
                resourceName={resource.name}
                resourceStatus={resource.status}
                kindCategory="PREVENTIVE_MAINTENANCE"
                intervalDays={resource.maintenanceIntervalDays}
                affectedBookingsCount={affectedBookingsCount}
                actorName={actorName}
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-canvas text-xs font-bold text-navy border border-card-edge shadow-2xs transition-colors"
                  >
                    Record maintenance
                  </button>
                }
              />
            )}

            <RecordEquipmentDialog
              resourceId={resource.id}
              resourceName={resource.name}
              resourceStatus={resource.status}
              kindCategory="CHECK_OR_REPAIR"
              affectedBookingsCount={affectedBookingsCount}
              actorName={actorName}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-canvas text-xs font-bold text-navy border border-card-edge shadow-2xs transition-colors"
                >
                  Record check or repair
                </button>
              }
            />

            <RecordEquipmentDialog
              resourceId={resource.id}
              resourceName={resource.name}
              resourceStatus={resource.status}
              kindCategory="REPLACEMENT_REVIEW"
              affectedBookingsCount={affectedBookingsCount}
              actorName={actorName}
              trigger={
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-canvas text-xs font-bold text-navy border border-card-edge shadow-2xs transition-colors"
                >
                  Record review
                </button>
              }
            />

            <BlockTimeButton
              actor={actor}
              resource={{ id: resource.id, siteId: resource.siteId }}
              reason={
                resource.maintenanceStatus === "DUE_TODAY" ||
                resource.maintenanceStatus === "OVERDUE" ||
                resource.maintenanceStatus === "DUE_SOON"
                  ? "Service"
                  : "Calibration"
              }
            />
          </div>
        )}
      </div>

      {/* Identity line */}
      {hasDetails && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-canvas border border-card-edge text-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Manufacturer
            </span>
            <p className="font-bold text-navy mt-0.5">{resource.manufacturer || "—"}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Model</span>
            <p className="font-bold text-navy mt-0.5">{resource.model || "—"}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              {labels.serialNumber}
            </span>
            <p className="font-mono font-bold text-navy mt-0.5">{resource.serialNumber || "—"}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              In service since
            </span>
            <p className="font-bold text-navy mt-0.5">
              {inServiceStr || "—"}
              {resource.expectedServiceLifeYears &&
                ` (${resource.expectedServiceLifeYears} yr lifespan)`}
            </p>
          </div>
        </div>
      )}

      {/* Schedule Tracker Rows */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Schedule status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Calibration */}
          {hasCalibration && (
            <div className="p-3.5 rounded-xl bg-canvas border border-card-edge flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Calibration</span>
                <EquipmentStatusTag status={resource.calibrationStatus ?? "NOT_TRACKED"} />
              </div>
              <p className="text-xs text-muted">
                {formatEquipmentStatusText({
                  type: "calibration",
                  status: resource.calibrationStatus ?? "NOT_TRACKED",
                  dueOn: calibDueStr,
                })}
              </p>
            </div>
          )}

          {/* Maintenance */}
          {hasMaintenance && (
            <div className="p-3.5 rounded-xl bg-canvas border border-card-edge flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">{labels.maintenance}</span>
                <EquipmentStatusTag status={resource.maintenanceStatus ?? "NOT_TRACKED"} />
              </div>
              <p className="text-xs text-muted">
                {formatEquipmentStatusText({
                  type: "maintenance",
                  status: resource.maintenanceStatus ?? "NOT_TRACKED",
                  dueOn: maintDueStr,
                })}
              </p>
            </div>
          )}

          {/* Replacement Review */}
          {hasDetails && (
            <div className="p-3.5 rounded-xl bg-canvas border border-card-edge flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Replacement review</span>
                <EquipmentStatusTag status={resource.reviewStatus ?? "NOT_TRACKED"} />
              </div>
              <p className="text-xs text-muted">
                {formatEquipmentStatusText({
                  type: "review",
                  status: resource.reviewStatus ?? "NOT_TRACKED",
                  dueOn: reviewDueStr,
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* History table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
            Verification & Maintenance History
          </h3>
          <span className="text-[11px] text-muted">ISO 15189 append-only log</span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-card-edge rounded-xl text-xs text-muted">
            No equipment records yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-card-edge bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas text-muted font-bold text-[11px] uppercase tracking-wider border-b border-card-edge">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Kind</th>
                  <th className="py-2.5 px-3">Performed by</th>
                  <th className="py-2.5 px-3">Work done</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3">Next due</th>
                  <th className="py-2.5 px-3">Reference</th>
                  <th className="py-2.5 px-3">Recorded by</th>
                  {canManage && <th className="py-2.5 px-3 text-right">PDF</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-card-edge">
                {history.map((rec) => {
                  const dayStr = dbToDay(rec.performedOn);
                  const isFail = rec.outcome === "FAIL";
                  const isNotDone = rec.outcome === "NOT_DONE";

                  let kindName = "Calibration";
                  if (rec.kind === "PREVENTIVE_MAINTENANCE") {
                    kindName = iconKey === "vehicle" ? "Vehicle service" : "Preventive maintenance";
                  } else if (rec.kind === "PERFORMANCE_CHECK") {
                    kindName = "Performance check";
                  } else if (rec.kind === "REPAIR") {
                    kindName = "Repair";
                  } else if (rec.kind === "REPLACEMENT_REVIEW") {
                    kindName = "Lifecycle review";
                  }

                  let outcomeBadge = (
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-soft text-green">
                      Pass
                    </span>
                  );
                  if (isFail) {
                    outcomeBadge = (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-soft text-red">
                        Fail
                      </span>
                    );
                  } else if (isNotDone) {
                    outcomeBadge = (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-soft text-amber">
                        Not done
                      </span>
                    );
                  } else if (rec.outcome === "KEEP_IN_SERVICE") {
                    outcomeBadge = (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-soft text-green">
                        Keep in service
                      </span>
                    );
                  } else if (rec.outcome === "REPLACE") {
                    outcomeBadge = (
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-soft text-red">
                        Replace
                      </span>
                    );
                  }

                  return (
                    <tr key={rec.id} className="hover:bg-mint/40 transition-colors">
                      <td className="py-2.5 px-3 text-navy font-bold whitespace-nowrap">
                        {formatEquipmentDay(dayStr)}
                      </td>
                      <td className="py-2.5 px-3 text-navy font-semibold whitespace-nowrap">
                        {kindName}
                      </td>
                      <td className="py-2.5 px-3 text-navy">
                        <div className="font-semibold">{rec.performedBy}</div>
                        {rec.externalCompany && (
                          <div className="text-[11px] text-muted">{rec.externalCompany}</div>
                        )}
                      </td>
                      <td
                        className="py-2.5 px-3 text-muted max-w-[160px] truncate"
                        title={rec.workPerformed || rec.notes || undefined}
                      >
                        {rec.workPerformed || rec.notes || "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{outcomeBadge}</td>
                      <td
                        className="py-2.5 px-3 text-muted max-w-[120px] truncate"
                        title={rec.notes ?? undefined}
                      >
                        {rec.notes || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-navy font-semibold whitespace-nowrap">
                        {rec.nextDueOn ? formatEquipmentDay(dbToDay(rec.nextDueOn)) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-muted">{rec.reference || "—"}</td>
                      <td className="py-2.5 px-3 text-muted whitespace-nowrap">
                        {rec.recordedBy.name}
                      </td>
                      {canManage && (
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={`/equipment/records/${rec.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-teal hover:text-teal-deep"
                            title="Service record PDF"
                          >
                            <FileText className="size-3.5" />
                          </a>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
