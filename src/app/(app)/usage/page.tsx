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
      <div className="space-y-6 w-full">
        <PageHeader eyebrow="BenchBook / Usage" title="Usage" description="Resource utilisation and statistics" />
        <div
          role="alert"
          className="p-4 sm:p-5 rounded-2xl border border-red/30 bg-red-soft text-red text-sm font-semibold flex items-center gap-3 shadow-2xs"
        >
          <AlertCircle className="size-5 shrink-0 text-red" />
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
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <PageHeader
        eyebrow="BenchBook / Usage"
        title="Usage"
        description={`${data.scopeLabel}. ${data.rangeFormatted}.`}
        actions={
          <Button
            asChild
            variant="outline"
            className="border-card-edge bg-card hover:bg-mint text-navy font-semibold text-xs h-9 px-3.5 gap-2 rounded-xl shadow-2xs"
          >
            <Link
              href={`/usage/export?from=${data.fromDate}&to=${data.toDate}&site=${data.siteId}`}
            >
              <Download className="size-3.5 text-teal" />
              <span>Download CSV</span>
            </Link>
          </Button>
        }
      />

      {/* Filter Bar */}
      <AutoFilter
        action="/usage"
        className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 sm:p-3.5 rounded-2xl border border-card-edge shadow-v4 text-xs font-semibold"
      >
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-2">
            <Calendar className="size-3.5 text-muted" />
            <label htmlFor="filter-from" className="text-muted uppercase text-[11px] font-extrabold tracking-wider">
              From:
            </label>
            <input
              id="filter-from"
              name="from"
              type="date"
              defaultValue={data.fromDate}
              required
              className="h-8 w-36 rounded-xl border border-card-edge bg-card px-2.5 text-xs font-semibold text-navy outline-none focus:border-teal cursor-pointer shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="filter-to" className="text-muted uppercase text-[11px] font-extrabold tracking-wider">
              To:
            </label>
            <input
              id="filter-to"
              name="to"
              type="date"
              defaultValue={data.toDate}
              required
              className="h-8 w-36 rounded-xl border border-card-edge bg-card px-2.5 text-xs font-semibold text-navy outline-none focus:border-teal cursor-pointer shadow-2xs"
            />
          </div>

          {/* Admin Site Select vs Manager Site Text */}
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-muted" />
              <label htmlFor="filter-site" className="text-muted uppercase text-[11px] font-extrabold tracking-wider">
                Site:
              </label>
              <select
                id="filter-site"
                name="site"
                defaultValue={data.siteId}
                className="h-8 rounded-xl bg-card border border-card-edge px-2.5 text-xs text-navy font-semibold focus:border-teal outline-none cursor-pointer shadow-2xs"
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
            <div className="flex items-center gap-1.5 text-muted">
              <Building2 className="size-3.5 text-muted" />
              <span className="uppercase text-[11px] font-extrabold tracking-wider">Site:</span>
              <span className="font-bold text-navy">{data.scopeLabel}</span>
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

      {/* Content: EmptyState or Charts + Resources */}
      {data.totals.totalBookedHours === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No bookings in this period."
          description="There were no resource reservations recorded for the selected date range."
          action={
            <Button
              asChild
              className="bg-teal hover:bg-teal-deep text-white font-semibold text-xs rounded-xl shadow-2xs"
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

          {/* Resources Table (Desktop) & Cards (Mobile) */}
          <div className="space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-card-edge bg-card overflow-hidden shadow-v4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-canvas/60 text-muted font-extrabold text-[11px] tracking-[0.1em] uppercase border-b border-card-edge">
                    <tr>
                      <th className="py-3 px-4 font-bold">Resource</th>
                      {data.siteId === "all" && <th className="py-3 px-4 font-bold">Site</th>}
                      <th className="py-3 px-4 font-bold text-right">Standard hours</th>
                      <th className="py-3 px-4 font-bold text-right">Total booked</th>
                      <th className="py-3 px-4 font-bold">Utilisation</th>
                      <th className="py-3 px-4 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-card">
                    {data.resources.map((res) => (
                      <tr key={res.id} className="hover:bg-mint/30 transition-colors">
                        {/* Resource Name and Category */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <CategoryIcon
                              iconKey={res.iconKey}
                              className="size-7 rounded-xl shrink-0"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/resources/${res.id}`}
                                className="font-bold text-navy hover:text-teal transition-colors truncate block text-sm"
                              >
                                {res.name}
                              </Link>
                              <span className="text-[11.5px] text-muted block truncate font-medium">
                                {res.categoryName}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Site (only shown if All sites) */}
                        {data.siteId === "all" && (
                          <td className="py-3 px-4 text-muted whitespace-nowrap font-medium">
                            {res.siteName}
                          </td>
                        )}

                        {/* Standard Hours */}
                        <td className="py-3 px-4 text-right tabular-nums text-muted font-medium whitespace-nowrap">
                          {res.bookedHoursStandard.toFixed(1)} h
                        </td>

                        {/* Total Booked Hours */}
                        <td className="py-3 px-4 text-right tabular-nums text-navy font-bold whitespace-nowrap">
                          {res.bookedHoursTotal.toFixed(1)} h
                        </td>

                        {/* Utilisation Bar + % */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <UtilisationBar percent={res.utilisation} />
                        </td>

                        {/* Classification Pill */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {res.classification === "busy" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-teal-soft text-teal-deep border border-teal-line">
                              Busy (≥70%)
                            </span>
                          ) : res.classification === "idle" ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-soft text-amber border border-amber-line">
                              Idle (&lt;10%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-canvas text-muted border border-card-edge">
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

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden space-y-3">
              {data.resources.map((res) => (
                <div
                  key={res.id}
                  className="rounded-2xl border border-card-edge bg-card p-4 shadow-v4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon iconKey={res.iconKey} className="size-8 rounded-xl shrink-0" />
                      <div className="min-w-0">
                        <Link
                          href={`/resources/${res.id}`}
                          className="font-bold text-navy hover:text-teal transition-colors truncate block text-sm"
                        >
                          {res.name}
                        </Link>
                        <span className="text-[11.5px] text-muted block truncate font-medium">
                          {res.categoryName} {data.siteId === "all" ? `• ${res.siteName}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {res.classification === "busy" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-extrabold bg-teal-soft text-teal-deep border border-teal-line">
                          Busy
                        </span>
                      ) : res.classification === "idle" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-soft text-amber border border-amber-line">
                          Idle
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-canvas text-muted border border-card-edge">
                          Normal
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-line">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted font-semibold">Utilisation:</span>
                      <UtilisationBar percent={res.utilisation} />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-muted font-medium">Total booked:</span>
                      <span className="font-bold text-navy tab">{res.bookedHoursTotal.toFixed(1)} h</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted font-medium">Standard hours:</span>
                      <span className="text-muted font-medium tab">{res.bookedHoursStandard.toFixed(1)} h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footnote under table */}
            <div className="flex items-center gap-1.5 text-xs text-muted px-1 pt-1">
              <HelpCircle className="size-3.5 shrink-0 text-muted" />
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
