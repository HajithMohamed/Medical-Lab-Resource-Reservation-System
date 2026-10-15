import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsage } from "@/services/usage";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (user.role === "STAFF") {
    return new Response("Forbidden: Staff cannot access usage reports", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const site = searchParams.get("site") ?? undefined;

  const result = await getUsage(user, { from, to, siteId: site });
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

  const filename = `usage-${siteSlug}-${data.fromDate}-to-${data.toDate}.csv`;

  // Build CSV content
  const headers = [
    "Resource",
    "Category",
    "Site",
    "Total Booked Hours",
    "Standard Hours Booked",
    "Utilisation %",
    "Classification",
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = data.resources.map((r) => [
    escapeCsv(r.name),
    escapeCsv(r.categoryName),
    escapeCsv(r.siteName),
    r.bookedHoursTotal.toFixed(1),
    r.bookedHoursStandard.toFixed(1),
    r.utilisation.toFixed(1),
    r.classification,
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
