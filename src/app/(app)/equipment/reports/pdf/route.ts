import { NextRequest } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import React from "react";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { getCurrentUser } from "@/lib/auth";
import { canViewEquipmentReports } from "@/lib/permissions";
import { env } from "@/lib/env";
import { APP_NAME } from "@/config/brand";
import { getEquipmentReport, equipmentReportFiltersSchema } from "@/services/equipment-report";
import { ReportSummaryPdf } from "@/components/equipment/pdf/report-summary-pdf";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canViewEquipmentReports(user)) {
    return new Response("Forbidden: You cannot access equipment reports", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const parsed = equipmentReportFiltersSchema.safeParse(Object.fromEntries(searchParams.entries()));

  const filterOptions = parsed.success ? parsed.data : {};

  // Fetch full log for the PDF export (not truncated to page 1)
  const result = await getEquipmentReport(user, {
    ...filterOptions,
    pageSize: 10000,
  });

  if (!result.ok) {
    return new Response(result.error, { status: 400 });
  }

  const data = result.data;
  const siteSlug =
    data.siteId === "all"
      ? "all-sites"
      : data.scopeLabel
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

  const filename = `equipment-report-${siteSlug}-${data.fromDate}-to-${data.toDate}.pdf`;

  const generatedAt = format(new TZDate(new Date(), env.APP_TIME_ZONE), "yyyy-MM-dd HH:mm");

  const pdfElement = React.createElement(ReportSummaryPdf, {
    labName: APP_NAME,
    scopeLabel: data.scopeLabel,
    fromDate: data.fromDate,
    toDate: data.toDate,
    generatedAt: `${generatedAt} (${env.APP_TIME_ZONE})`,
    generatedBy: user.name,
    conditionRows: data.conditionRows,
    conditionCounts: data.conditionCounts,
    logRows: data.logRows,
    logCounts: data.logCounts,
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
