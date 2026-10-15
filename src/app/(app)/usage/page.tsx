import * as React from "react";
import Link from "next/link";
import { BarChart3, Download, Building2, Calendar, AlertCircle, HelpCircle } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUsage, getDefaultUsageDateStrings } from "@/services/usage";
import { PageHeader } from "@/components/page-header";
import { SummaryStrip } from "@/components/summary-strip";
import { CategoryIcon } from "@/components/category-icon";
import { UtilisationBar } from "@/components/utilisation-bar";
import { EmptyState } from "@/components/empty-state";
import { PeakHoursChart } from "@/components/usage/peak-hours-chart";
import { SectionUsageChart } from "@/components/usage/section-usage-chart";
import { AutoFilter } from "@/components/auto-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STANDARD_DAY_START_HOUR, STANDARD_DAY_END_HOUR } from "@/config/rules";

export const metadata = {
  title: "Usage Reports | BenchBook",
  description: "Resource utilisation, peak hours, and section distribution.",
};

interface UsagePageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    site?: string;
    siteId?: string;
  }>;
}

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const actor = await requireRole("MANAGER", "ADMIN");
  const params = await searchParams;

  const defaultDates = getDefaultUsageDateStrings();
  const from = params.from || defaultDates.fromStr;
  const to = params.to || defaultDates.toStr;
  const requestedSite = params.site || params.siteId;

  const [usageResult, sites] = await Promise.all([
    getUsage(actor, { from, to, siteId: requestedSite }),
    actor.role === "ADMIN"
      ? db.site.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : [],
  ]);

  if (!usageResult.ok) {
    return (
      <div className="space-y-6 max-w-6xl">
        <PageHeader title="Usage" description="Resource utilisation and statistics" />
        <div
          role="alert"
          className="p-6 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-rose-200 text-sm font-mono flex items-center gap-3"
        >
          <AlertCircle className="size-5 shrink-0 text-rose-400" />
          <span>{usageResult.error}</span>
        </div>
      </div>
    );
  }

  const data = usageResult.data;
  const isAdmin = actor.role === "ADMIN";

  const standardStartFormatted = `${String(STANDARD_DAY_START_HOUR).padStart(2, "0")}:00`;
  const standardEndFormatted = `${String(STANDARD_DAY_END_HOUR).padStart(2, "0")}:00`;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <PageHeader
        eyebrow="BenchBook / Usage"
        title="Usage"
        description={`${data.scopeLabel}. ${data.rangeFormatted}.`}
        actions={
          <Button
            asChild
            variant="outline"
            className="border-[#334155] bg-[#141c2b] hover:bg-[#222a3a] text-slate-200 hover:text-white font-mono text-xs h-9 px-3.5 gap-2 shadow-xs"
          >
            <Link
              href={`/usage/export?from=${data.fromDate}&to=${data.toDate}&site=${data.siteId}`}
            >
              <Download className="size-3.5" />
              <span>Download CSV</span>
            </Link>
          </Button>
        }
      />

      {/* Filter Bar (AutoFilter without Apply button) */}
      <AutoFilter
        action="/usage"
        className="flex flex-wrap items-center justify-between gap-4 bg-[#141c2b] p-3.5 rounded-xl border border-[#334155] shadow-xs text-xs font-mono"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-[#879390]" />
            <label htmlFor="filter-from" className="text-[#94a3b8] uppercase">
              From:
            </label>
            <Input
              id="filter-from"
              name="from"
              type="date"
              defaultValue={data.fromDate}
              required
              className="h-8 w-36 bg-[#060e1d] border-[#334155] text-xs font-mono text-slate-100 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-to" className="text-[#94a3b8] uppercase">
              To:
            </label>
            <Input
              id="filter-to"
              name="to"
              type="date"
              defaultValue={data.toDate}
              required
              className="h-8 w-36 bg-[#060e1d] border-[#334155] text-xs font-mono text-slate-100 cursor-pointer"
            />
          </div>

          {/* Admin Site Select vs Manager Site Text */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-[#879390]" />
              <label htmlFor="filter-site" className="text-[#94a3b8] uppercase">
                Site:
              </label>
              <select
                id="filter-site"
                name="site"
                defaultValue={data.siteId}
                className="h-8 rounded-md bg-[#060e1d] border border-[#334155] px-2.5 text-xs text-slate-200 font-mono focus:border-[#6cd8cb] focus:outline-hidden cursor-pointer"
              >
                <option value="all">All sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[#94a3b8]">
              <Building2 className="size-3.5 text-[#879390]" />
              <span>Site:</span>
              <span className="font-bold text-white">{data.scopeLabel}</span>
            </div>
          )}
        </div>
      </AutoFilter>

      {/* Summary Statistics Strip */}
      <SummaryStrip
        items={[
          {
            label: "Booked",
            value: `${data.totals.totalBookedHours} hrs`,
            dotColor: "primary",
            hint: "Total usage across period",
          },
          {
            label: "Average utilisation",
            value: `${data.totals.averageUtilisation}%`,
            dotColor: "secondary",
            hint: "Standard working hours share",
          },
          {
            label: "Maintenance",
            value: `${data.totals.totalMaintenanceHours} hrs`,
            dotColor: "tertiary",
            hint: "Service and breakdown blocks",
          },
          {
            label: "Cancelled bookings",
            value: data.totals.cancelledBookingsCount,
            dotColor: "error",
            hint: "Cancellations in period",
          },
        ]}
      />

      {/* Content: EmptyState or Charts + Resources Table */}
      {data.totals.totalBookedHours === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No bookings in this period."
          description="There were no resource reservations recorded for the selected date range."
          action={
            <Button
              asChild
              className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono"
            >
              <Link href="/usage">Show the last 4 weeks</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Charts Grid: Peak Hours & Use by Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeakHoursChart data={data.peakHours} />
            <SectionUsageChart sections={data.sections} />
          </div>

          {/* Resources Table */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a]/70 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#141c2b] text-[#94a3b8] font-mono border-b border-[#1e293b]">
                    <tr>
                      <th className="py-2.5 px-3 font-medium">Resource</th>
                      {data.siteId === "all" && <th className="py-2.5 px-3 font-medium">Site</th>}
                      <th className="py-2.5 px-3 font-medium text-right">Standard hours</th>
                      <th className="py-2.5 px-3 font-medium text-right">Total booked</th>
                      <th className="py-2.5 px-3 font-medium">Utilisation</th>
                      <th className="py-2.5 px-3 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b] bg-[#060e1d]/60 font-mono">
                    {data.resources.map((res) => (
                      <tr key={res.id} className="hover:bg-[#141c2b]/50 transition-colors">
                        {/* Resource Name and Category */}
                        <td className="py-2 px-3 font-medium">
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon
                              iconKey={res.iconKey}
                              className="size-6 rounded shrink-0"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/resources/${res.id}`}
                                className="font-bold text-white hover:text-[#6cd8cb] transition-colors truncate block"
                              >
                                {res.name}
                              </Link>
                              <span className="text-[11px] text-[#94a3b8] block truncate">
                                {res.categoryName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Site (only shown if All sites) */}
                        {data.siteId === "all" && (
                          <td className="py-2 px-3 text-[#94a3b8] whitespace-nowrap">
                            {res.siteName}
                          </td>
                        )}

                        {/* Standard Hours */}
                        <td className="py-2 px-3 text-right tabular-nums text-slate-200 whitespace-nowrap">
                          {res.bookedHoursStandard.toFixed(1)} h
                        </td>

                        {/* Total Booked Hours */}
                        <td className="py-2 px-3 text-right tabular-nums text-white font-semibold whitespace-nowrap">
                          {res.bookedHoursTotal.toFixed(1)} h
                        </td>

                        {/* Utilisation Bar + % */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <UtilisationBar percent={res.utilisation} />
                        </td>

                        {/* Classification Pill */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {res.classification === "busy" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0E6A85] text-white shadow-xs">
                              Busy (≥70%)
                            </span>
                          ) : res.classification === "idle" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-slate-500/70 text-slate-300">
                              Idle (&lt;10%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-[#334155] text-slate-400">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footnote under table */}
            <div className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] font-mono px-1">
              <HelpCircle className="size-3.5 shrink-0 text-[#64748b]" />
              <span>
                Utilisation = booked time within standard hours (Monday to Friday,{" "}
                {standardStartFormatted} to {standardEndFormatted}) / standard hours in the period.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
