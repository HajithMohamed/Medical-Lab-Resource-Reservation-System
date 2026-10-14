import * as React from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listEquipmentOverview,
  listTodayTasks,
} from "@/services/equipment";
import { SummaryStrip } from "@/components/summary-strip";
import { FilterBar } from "@/components/filter-bar";
import { CategoryIcon } from "@/components/category-icon";
import { EquipmentStatusTag } from "@/components/equipment/equipment-status-tag";
import { MarkDoneDialog } from "@/components/equipment/mark-done-dialog";
import { MarkNotDoneDialog } from "@/components/equipment/mark-not-done-dialog";
import { Button } from "@/components/ui/button";
import { dbToDay } from "@/lib/equipment-dates";
import { formatEquipmentDay, formatEquipmentStatusText } from "@/lib/equipment-status";

export const metadata = {
  title: "Equipment Care | BenchBook",
};

interface EquipmentPageProps {
  searchParams: Promise<{
    siteId?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const user = await requireRole("MANAGER", "ADMIN");
  const params = await searchParams;

  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const siteId = params.siteId;
  const status = params.status;

  const [todayTasksResult, overviewResult, sites] = await Promise.all([
    listTodayTasks(user),
    listEquipmentOverview(user, { siteId, status, page, pageSize: 15 }),
    user.role === "ADMIN"
      ? db.site.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const tasks = todayTasksResult.ok ? todayTasksResult.data : [];
  const overview = overviewResult.ok
    ? overviewResult.data
    : {
        items: [],
        counts: { dueToday: 0, overdueOrFailed: 0, dueSoon: 0, replacementReviewsDue: 0 },
        totalCount: 0,
        totalPages: 1,
        page: 1,
        pageSize: 15,
      };

  const isAdmin = user.role === "ADMIN";
  const hasActiveFilters = Boolean(siteId || (status && status !== "ALL"));

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#6cd8cb]/10 text-[#6cd8cb] border border-[#6cd8cb]/20">
            <ClipboardCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Equipment care
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-0.5">
              Scheduled verifications, preventive maintenance, and lifecycle audits.
            </p>
          </div>
        </div>
      </div>

      {/* Top Section: Today list (Due Today & Overdue) */}
      <div className="space-y-3.5 rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-amber-300" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Today&apos;s schedule & overdue tasks
            </h2>
          </div>
          <span className="text-xs font-mono text-[#94a3b8]">
            {tasks.length} task{tasks.length === 1 ? "" : "s"} requiring attention
          </span>
        </div>

        {tasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#94a3b8]">Nothing is due today.</div>
        ) : (
          <div className="divide-y divide-[#1e293b]">
            {tasks.map((task) => {
              const isOverdue = task.status === "OVERDUE";
              const formattedDue = formatEquipmentDay(task.dueOn);

              return (
                <div
                  key={task.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#141c2b]/30 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryIcon iconKey={task.categoryIconKey} className="size-6 rounded shrink-0" />
                      <Link
                        href={`/resources/${task.resourceId}`}
                        className="font-bold text-sm text-white hover:text-[#6cd8cb] transition-colors truncate"
                      >
                        {task.resourceName}
                      </Link>

                      {isAdmin && (
                        <span className="text-xs text-[#94a3b8] font-mono">
                          ({task.siteName})
                        </span>
                      )}

                      <span className="text-xs px-2 py-0.5 rounded bg-[#1e293b] text-slate-300 font-mono">
                        {task.tracker === "calibration" ? "Calibration" : "Service"}
                      </span>

                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                          <AlertCircle className="size-3 shrink-0" />
                          <span>Overdue by {task.daysOverdue} day{task.daysOverdue === 1 ? "" : "s"}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                          <span>Due today ({formattedDue})</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[#94a3b8] flex flex-wrap items-center gap-x-3 gap-y-1">
                      {task.affectedBookingsCount > 0 ? (
                        <span className="text-amber-300/90 font-medium">
                          {task.affectedBookingsCount} booking{task.affectedBookingsCount === 1 ? "" : "s"} end after due date
                        </span>
                      ) : (
                        <span>No upcoming bookings past due day</span>
                      )}

                      {task.lastNotDone && (
                        <span className="text-[#bcc9c6]">
                          &bull; Not done noted: &ldquo;{task.lastNotDone.notes}&rdquo;
                          {task.lastNotDone.plannedDate &&
                            ` (target: ${formatEquipmentDay(task.lastNotDone.plannedDate)})`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <MarkDoneDialog
                      resourceId={task.resourceId}
                      resourceName={task.resourceName}
                      resourceStatus={task.resourceStatus}
                      tracker={task.tracker}
                      dueOn={task.dueOn}
                      intervalDays={task.intervalDays}
                      affectedBookingsCount={task.affectedBookingsCount}
                      actorName={user.name}
                    />
                    <MarkNotDoneDialog
                      resourceId={task.resourceId}
                      resourceName={task.resourceName}
                      tracker={task.tracker}
                      dueOn={task.dueOn}
                      affectedBookingsCount={task.affectedBookingsCount}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Statistics Strip */}
      <SummaryStrip
        items={[
          {
            label: "Due today",
            value: overview.counts.dueToday,
            dotColor: "tertiary",
            hint: "Verifications due today",
          },
          {
            label: "Overdue or failed",
            value: overview.counts.overdueOrFailed,
            dotColor: "error",
            hint: "Immediate action required",
          },
          {
            label: "Due in 30 days",
            value: overview.counts.dueSoon,
            dotColor: "secondary",
            hint: "Upcoming verification window",
          },
          {
            label: "Lifecycle reviews",
            value: overview.counts.replacementReviewsDue,
            dotColor: "primary",
            hint: "Equipment nearing life limit",
          },
        ]}
      />

      {/* Filter Bar */}
      <FilterBar
        action="/equipment"
        hasActiveFilters={hasActiveFilters}
        clearHref="/equipment"
      >
        {isAdmin && (
          <div className="flex items-center gap-2">
            <label htmlFor="filter-site" className="text-xs text-[#94a3b8] font-mono uppercase">
              Site:
            </label>
            <select
              id="filter-site"
              name="siteId"
              defaultValue={siteId ?? ""}
              className="h-9 rounded-md border border-[#334155] bg-[#060e1d] px-2.5 text-xs text-white focus:border-[#6cd8cb] focus:outline-none cursor-pointer"
            >
              <option value="">All laboratory sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label htmlFor="filter-status" className="text-xs text-[#94a3b8] font-mono uppercase">
            Status:
          </label>
          <select
            id="filter-status"
            name="status"
            defaultValue={status ?? "ALL"}
            className="h-9 rounded-md border border-[#334155] bg-[#060e1d] px-2.5 text-xs text-white focus:border-[#6cd8cb] focus:outline-none cursor-pointer"
          >
            <option value="ALL">All schedules</option>
            <option value="OVERDUE">Overdue or failed</option>
            <option value="DUE_TODAY">Due today</option>
            <option value="DUE_SOON">Due soon (within 30 days)</option>
            <option value="CURRENT">Current</option>
          </select>
        </div>
      </FilterBar>

      {/* Overview Table */}
      <div className="space-y-4">
        {overview.items.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border border-dashed border-[#1e293b] bg-[#0f172a]/30 p-8 space-y-2">
            <ClipboardCheck className="size-8 text-[#94a3b8] mx-auto opacity-50" />
            <p className="text-sm font-semibold text-white">Nothing to track yet.</p>
            <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
              Add calibration or service details when you add or edit a resource.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a]/70 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141c2b] text-[#94a3b8] font-mono border-b border-[#1e293b]">
                  <tr>
                    <th className="py-3 px-4 font-medium">Resource</th>
                    {isAdmin && <th className="py-3 px-4 font-medium">Site</th>}
                    <th className="py-3 px-4 font-medium">Calibration</th>
                    <th className="py-3 px-4 font-medium">Maintenance</th>
                    <th className="py-3 px-4 font-medium">Lifecycle review</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] bg-[#060e1d]/60">
                  {overview.items.map((res) => {
                    const calibDueStr = res.nextCalibrationDueOn
                      ? dbToDay(res.nextCalibrationDueOn)
                      : null;
                    const maintDueStr = res.nextMaintenanceDueOn
                      ? dbToDay(res.nextMaintenanceDueOn)
                      : null;
                    const reviewDueStr = res.replacementReviewDueOn
                      ? dbToDay(res.replacementReviewDueOn)
                      : null;

                    const isDueSoon =
                      res.calibrationStatus === "DUE_SOON" ||
                      res.maintenanceStatus === "DUE_SOON" ||
                      res.calibrationStatus === "DUE_TODAY" ||
                      res.maintenanceStatus === "DUE_TODAY" ||
                      res.calibrationStatus === "OVERDUE" ||
                      res.maintenanceStatus === "OVERDUE";

                    return (
                      <tr key={res.id} className="hover:bg-[#141c2b]/50 transition-colors">
                        <td className="py-3 px-4 font-medium">
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon iconKey={res.category.iconKey} className="size-6 rounded shrink-0" />
                            <div>
                              <Link
                                href={`/resources/${res.id}`}
                                className="font-semibold text-white hover:text-[#6cd8cb] transition-colors"
                              >
                                {res.name}
                              </Link>
                              <div className="text-[11px] text-[#94a3b8]">
                                {res.category.name} &bull; {res.section.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {isAdmin && (
                          <td className="py-3 px-4 text-[#94a3b8] font-mono whitespace-nowrap">
                            {res.site.name}
                          </td>
                        )}

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <EquipmentStatusTag status={res.calibrationStatus} />
                            <div className="text-[11px] text-[#94a3b8]">
                              {formatEquipmentStatusText({
                                type: "calibration",
                                status: res.calibrationStatus,
                                dueOn: calibDueStr,
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <EquipmentStatusTag status={res.maintenanceStatus} />
                            <div className="text-[11px] text-[#94a3b8]">
                              {formatEquipmentStatusText({
                                type: "maintenance",
                                status: res.maintenanceStatus,
                                dueOn: maintDueStr,
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <EquipmentStatusTag status={res.reviewStatus} />
                            <div className="text-[11px] text-[#94a3b8]">
                              {formatEquipmentStatusText({
                                type: "review",
                                status: res.reviewStatus,
                                dueOn: reviewDueStr,
                              })}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs border-[#334155]">
                              <Link href={`/resources/${res.id}`} className="gap-1">
                                <span>Details</span>
                                <ExternalLink className="size-3 text-[#94a3b8]" />
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {overview.totalPages > 1 && (
              <div className="p-3.5 border-t border-[#1e293b] bg-[#141c2b] flex items-center justify-between text-xs text-[#94a3b8]">
                <span>
                  Showing page {overview.page} of {overview.totalPages} ({overview.totalCount} total)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    asChild={overview.page > 1}
                    disabled={overview.page <= 1}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                  >
                    {overview.page > 1 ? (
                      <Link
                        href={`/equipment?page=${overview.page - 1}${siteId ? `&siteId=${siteId}` : ""}${status ? `&status=${status}` : ""}`}
                      >
                        <ChevronLeft className="size-3.5" />
                        <span>Previous</span>
                      </Link>
                    ) : (
                      <span>
                        <ChevronLeft className="size-3.5" />
                        <span>Previous</span>
                      </span>
                    )}
                  </Button>
                  <Button
                    asChild={overview.page < overview.totalPages}
                    disabled={overview.page >= overview.totalPages}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                  >
                    {overview.page < overview.totalPages ? (
                      <Link
                        href={`/equipment?page=${overview.page + 1}${siteId ? `&siteId=${siteId}` : ""}${status ? `&status=${status}` : ""}`}
                      >
                        <span>Next</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    ) : (
                      <span>
                        <span>Next</span>
                        <ChevronRight className="size-3.5" />
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
