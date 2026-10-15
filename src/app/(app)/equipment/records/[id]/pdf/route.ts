import { NextRequest } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";
import { canViewEquipmentReports } from "@/lib/permissions";
import { db } from "@/lib/db";
import { APP_NAME } from "@/config/brand";
import {
  CALIBRATION_DUE_SOON_DAYS,
  CONDITION_LOOKBACK_DAYS,
  MAINTENANCE_DUE_SOON_DAYS,
} from "@/config/rules";
import { addDaysToDay, dbToDay, dayToDb } from "@/lib/equipment-dates";
import { trackerStatus } from "@/lib/equipment-status";
import { equipmentCondition } from "@/lib/equipment-condition";
import { labToday } from "@/lib/time";
import { ServiceRecordPdf } from "@/components/equipment/pdf/service-record-pdf";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Staff are forbidden
  if (!canViewEquipmentReports(user)) {
    return new Response("Forbidden: You cannot access service records", {
      status: 403,
    });
  }

  const { id: recordId } = await params;

  const record = await db.equipmentRecord.findUnique({
    where: { id: recordId },
    include: {
      resource: {
        include: {
          site: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
      },
      recordedBy: { select: { name: true } },
    },
  });

  if (!record) {
    return new Response("Service record not found", { status: 404 });
  }

  // Manager isolation: 404 (not 403) for another site's record
  if (user.role === "MANAGER" && record.resource.siteId !== user.siteId) {
    return new Response("Service record not found", { status: 404 });
  }

  // Calculate current condition of this resource at download time
  const today = labToday();
  const lookbackCutoff = dayToDb(addDaysToDay(today, -CONDITION_LOOKBACK_DAYS));

  const resourceRecords = await db.equipmentRecord.findMany({
    where: {
      resourceId: record.resourceId,
      performedOn: { gte: lookbackCutoff },
    },
    orderBy: [{ performedOn: "desc" }, { createdAt: "desc" }],
    select: { kind: true, outcome: true, performedOn: true },
  });

  const nextCalDay = record.resource.nextCalibrationDueOn
    ? dbToDay(record.resource.nextCalibrationDueOn)
    : null;
  const nextMaintDay = record.resource.nextMaintenanceDueOn
    ? dbToDay(record.resource.nextMaintenanceDueOn)
    : null;
  const inServiceDay = record.resource.inServiceOn ? dbToDay(record.resource.inServiceOn) : null;

  const calStatus = trackerStatus({
    dueOn: nextCalDay,
    today,
    dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
  });
  const maintStatus = trackerStatus({
    dueOn: nextMaintDay,
    today,
    dueSoonDays: MAINTENANCE_DUE_SOON_DAYS,
  });

  const checkRecords = resourceRecords.filter((rec) =>
    ["CALIBRATION", "PERFORMANCE_CHECK", "REPAIR"].includes(rec.kind),
  );
  const latestCheck = checkRecords[0];

  const failuresIn12Months = resourceRecords.filter((rec) => rec.outcome === "FAIL").length;
  const repairsIn12Months = resourceRecords.filter((rec) => rec.kind === "REPAIR").length;

  const hasSchedules =
    record.resource.calibrationIntervalDays != null ||
    record.resource.maintenanceIntervalDays != null ||
    record.resource.nextCalibrationDueOn != null ||
    record.resource.nextMaintenanceDueOn != null;

  const cond = equipmentCondition({
    resourceStatus: record.resource.status,
    calibrationTrackerStatus: calStatus,
    maintenanceTrackerStatus: maintStatus,
    latestCheckOutcome: latestCheck?.outcome ?? null,
    failuresInLookback: failuresIn12Months,
    repairsInLookback: repairsIn12Months,
    inServiceOn: inServiceDay,
    expectedServiceLifeYears: record.resource.expectedServiceLifeYears,
    today,
    nextCalibrationDueOn: nextCalDay,
    nextMaintenanceDueOn: nextMaintDay,
    hasSchedules,
    hasRecords: resourceRecords.length > 0,
  });

  const filename = `service-record-${record.id}.pdf`;

  const pdfElement = React.createElement(ServiceRecordPdf, {
    labName: APP_NAME,
    record: {
      id: record.id,
      kind: record.kind,
      performedOn: dbToDay(record.performedOn),
      performedBy: record.performedBy,
      externalCompany: record.externalCompany,
      workPerformed: record.workPerformed,
      outcome: record.outcome,
      reason: record.notes,
      nextDueOn: record.nextDueOn ? dbToDay(record.nextDueOn) : null,
      reference: record.reference,
      recordedByName: record.recordedBy.name,
      recordedAtFormatted: format(record.createdAt, "yyyy-MM-dd HH:mm"),
    },
    resource: {
      id: record.resource.id,
      name: record.resource.name,
      manufacturer: record.resource.manufacturer,
      model: record.resource.model,
      serialNumber: record.resource.serialNumber,
      siteName: record.resource.site.name,
      sectionName: record.resource.section?.name ?? null,
      categoryName: record.resource.category.name,
    },
    condition: cond,
  });

  const buffer = await renderToBuffer(pdfElement as unknown as React.ReactElement<DocumentProps>);

  return new Response(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
