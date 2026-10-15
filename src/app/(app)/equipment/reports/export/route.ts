import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { canViewEquipmentReports } from "@/lib/permissions";
import { getEquipmentReport, equipmentReportFiltersSchema } from "@/services/equipment-report";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canViewEquipmentReports(user)) {
    return new Response("Forbidden: You cannot export equipment reports", {
      status: 403,
    });
  }

  const { searchParams } = new URL(request.url);
  const parsed = equipmentReportFiltersSchema.safeParse(Object.fromEntries(searchParams.entries()));

  const filterOptions = parsed.success ? parsed.data : {};

  // Fetch full log rows for export
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

  const filename = `equipment-log-${siteSlug}-${data.fromDate}-to-${data.toDate}.csv`;

  const headers = [
    "Date",
    "Equipment",
    "Site",
    "Section",
    "Type",
    "Performed By",
    "External Company",
    "Work Performed",
    "Outcome",
    "Next Due On",
    "Recorded By",
  ];

  const escapeCsv = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.logRows.map((r) => [
    escapeCsv(r.date),
    escapeCsv(r.resourceName),
    escapeCsv(r.siteName),
    escapeCsv(r.sectionName || ""),
    escapeCsv(r.kind),
    escapeCsv(r.performedBy),
    escapeCsv(r.externalCompany || ""),
    escapeCsv(r.workPerformed || ""),
    escapeCsv(r.outcome),
    escapeCsv(r.nextDueOn || ""),
    escapeCsv(r.recordedByName),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
