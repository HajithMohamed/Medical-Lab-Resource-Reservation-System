import * as React from "react";
import Link from "next/link";
import {
  Wrench,
  Clock,
  ClipboardCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Calendar,
  History,
  Eye,
  BarChart3,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listEquipmentOverview, listTodayTasks } from "@/services/equipment";
import { listBlocks } from "@/services/maintenance";
import { getEquipmentReport } from "@/services/equipment-report";
import { PageHeader } from "@/components/page-header";
import { SummaryStrip } from "@/components/summary-strip";
import { FilterBar } from "@/components/filter-bar";
import { CategoryIcon } from "@/components/category-icon";
import { EquipmentStatusTag } from "@/components/equipment/equipment-status-tag";
import { MarkDoneDialog } from "@/components/equipment/mark-done-dialog";
import { MarkNotDoneDialog } from "@/components/equipment/mark-not-done-dialog";
import { BlockTimeButton } from "@/components/equipment/block-time-button";
import { BlockedSiteFilter } from "@/components/maintenance/blocked-site-filter";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { EquipmentReportsTab } from "@/components/equipment/reports/equipment-reports-tab";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { dbToDay } from "@/lib/equipment-dates";
import { formatEquipmentDay, formatEquipmentStatusText } from "@/lib/equipment-status";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Maintenance & Care | BenchBook",
  description:
    "Scheduled verifications, preventive maintenance, lifecycle audits, and blocked time.",
};

interface EquipmentPageProps {
  searchParams: Promise<{
    tab?: string;
    siteId?: string;
    site?: string;
    status?: string;
    page?: string;
    range?: string;
    from?: string;
    to?: string;
    section?: string;
    category?: string;
    kind?: string;
    outcome?: string;
  }>;
}

export default async function EquipmentPage({ searchParams }: EquipmentPageProps) {
  const user = await requireRole("MANAGER", "ADMIN");
  const params = await searchParams;

  const activeTab: "today" | "schedule" | "blocked" | "reports" =
    params.tab === "reports"
      ? "reports"
      : params.tab === "schedule"
        ? "schedule"
        : params.tab === "blocked"
          ? "blocked"
          : "today";

  const isAdmin = user.role === "ADMIN";

  // Common sites query for ADMIN
  const sites = isAdmin
    ? await db.site.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  // Tab: Today
  const todayTasksResult = await listTodayTasks(user);
  const tasks = todayTasksResult.ok ? todayTasksResult.data : [];

  // Tab: Schedule (only queried when active)
  const schedulePage = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const scheduleSiteId = params.siteId;
  const scheduleStatus = params.status;

  const overviewResult =
    activeTab === "schedule"
      ? await listEquipmentOverview(user, {
          siteId: scheduleSiteId,
          status: scheduleStatus,
          page: schedulePage,
          pageSize: 10,
        })
      : null;

  const overview =
    overviewResult && overviewResult.ok
      ? overviewResult.data
      : {
          items: [],
          counts: { dueToday: 0, overdueOrFailed: 0, dueSoon: 0, replacementReviewsDue: 0 },
          totalCount: 0,
          totalPages: 1,
          page: 1,
          pageSize: 10,
        };

  // Tab: Blocked time (only queried when active)
  const blockedRange: "upcoming" | "recent" = params.range === "recent" ? "recent" : "upcoming";
  const blockedSiteId = params.siteId || params.site;
  const blockedPage = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;

  const blocksResult =
    activeTab === "blocked"
      ? await listBlocks(user, {
          siteId: blockedSiteId,
          range: blockedRange,
          page: blockedPage,
        })
      : null;

  const blocks = blocksResult ? blocksResult.blocks : [];
  const blocksTotalPages = blocksResult ? blocksResult.totalPages : 1;
  const blocksTotalCount = blocksResult ? blocksResult.totalCount : 0;
  const blocksPageSize = blocksResult ? blocksResult.pageSize : 20;
  const currentBlockedSiteName = sites.find((s) => s.id === blockedSiteId)?.name;

  // Tab: Reports (only queried when active)
  const reportResult =
    activeTab === "reports"
      ? await getEquipmentReport(user, {
          from: params.from,
          to: params.to,
          site: params.site,
          section: params.section,
          category: params.category,
          kind: params.kind,
          outcome: params.outcome,
          page: params.page ? parseInt(params.page, 10) : 1,
        })
      : null;

  const reportSections =
    activeTab === "reports"
      ? await db.section.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const reportCategories =
    activeTab === "reports"
      ? await db.category.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <PageHeader
        eyebrow="BenchBook / Maintenance & care"
        title="Maintenance & care"
        description={
          isAdmin
            ? "Calibration, service and blocked time across every site."
            : "Calibration, service and blocked time for your site."
        }
        actions={
          <Button
            asChild
            className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono h-9 px-4 rounded-lg shadow-xs"
          >
            <Link
              href={`/maintenance/new?returnTo=${encodeURIComponent(`/equipment?tab=${activeTab}`)}`}
            >
              <Wrench className="size-3.5 mr-2" />
              <span>Block time</span>
            </Link>
          </Button>
        }
      />

      {/* Tabs Navigation (Segmented style, URL-backed) */}
      <div className="border-b border-[#334155]/60 pb-3">
        <nav
          aria-label="Maintenance & care sections"
          className="flex items-center gap-1 bg-[#060e1d] p-1 rounded-xl border border-[#334155]/60 w-fit"
        >
          <Link
            href="/equipment?tab=today"
            aria-current={activeTab === "today" ? "page" : undefined}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2",
              activeTab === "today"
                ? "bg-[#141c2b] text-white font-semibold shadow-xs border border-[#334155]"
                : "text-[#879390] hover:text-white",
            )}
          >
            <Clock className="size-3.5 text-amber-300" />
            <span>Today</span>
            {tasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {tasks.length}
              </span>
            )}
          </Link>
          <Link
            href="/equipment?tab=schedule"
            aria-current={activeTab === "schedule" ? "page" : undefined}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2",
              activeTab === "schedule"
                ? "bg-[#141c2b] text-white font-semibold shadow-xs border border-[#334155]"
                : "text-[#879390] hover:text-white",
            )}
          >
            <ClipboardCheck className="size-3.5 text-[#6cd8cb]" />
            <span>Schedule</span>
          </Link>
          <Link
            href="/equipment?tab=blocked"
            aria-current={activeTab === "blocked" ? "page" : undefined}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2",
              activeTab === "blocked"
                ? "bg-[#141c2b] text-white font-semibold shadow-xs border border-[#334155]"
                : "text-[#879390] hover:text-white",
            )}
          >
            <Wrench className="size-3.5 text-amber-400" />
            <span>Blocked time</span>
          </Link>
          <Link
            href="/equipment?tab=reports"
            aria-current={activeTab === "reports" ? "page" : undefined}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-2",
              activeTab === "reports"
                ? "bg-[#141c2b] text-white font-semibold shadow-xs border border-[#334155]"
                : "text-[#879390] hover:text-white",
            )}
          >
            <BarChart3 className="size-3.5 text-[#7bd0ff]" />
            <span>Reports</span>
          </Link>
        </nav>
      </div>

      {/* Tab 1: Today */}
      {activeTab === "today" && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] p-5 shadow-xs space-y-3.5">
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
              <div className="py-12 text-center text-xs text-[#94a3b8] font-mono">
                Nothing is due today.
              </div>
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
                          <CategoryIcon
                            iconKey={task.categoryIconKey}
                            className="size-6 rounded shrink-0"
                          />
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
                              <span>
                                Overdue by {task.daysOverdue} day{task.daysOverdue === 1 ? "" : "s"}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                              <span>Due today ({formattedDue})</span>
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#94a3b8] flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                          {task.affectedBookingsCount > 0 ? (
                            <span className="text-amber-300/90 font-medium">
                              {task.affectedBookingsCount} booking
                              {task.affectedBookingsCount === 1 ? "" : "s"} end after due date
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
                        <BlockTimeButton
                          actor={user}
                          resource={{ id: task.resourceId, siteId: task.siteId }}
                          reason={task.tracker === "calibration" ? "Calibration" : "Service"}
                          returnTo="/equipment?tab=today"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Schedule */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
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
            hasActiveFilters={Boolean(
              scheduleSiteId || (scheduleStatus && scheduleStatus !== "ALL"),
            )}
            clearHref="/equipment?tab=schedule"
          >
            <input type="hidden" name="tab" value="schedule" />
            {isAdmin && (
              <div className="flex items-center gap-2">
                <label htmlFor="filter-site" className="text-xs text-[#94a3b8] font-mono uppercase">
                  Site:
                </label>
                <select
                  id="filter-site"
                  name="siteId"
                  defaultValue={scheduleSiteId ?? ""}
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
                defaultValue={scheduleStatus ?? "ALL"}
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
                        <th className="py-2.5 px-3 font-medium">Resource</th>
                        {isAdmin && <th className="py-2.5 px-3 font-medium">Site</th>}
                        <th className="py-2.5 px-3 font-medium">Calibration</th>
                        <th className="py-2.5 px-3 font-medium">Maintenance</th>
                        <th className="py-2.5 px-3 font-medium">Lifecycle review</th>
                        <th className="py-2.5 px-3 font-medium text-right">Actions</th>
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
                            <td className="py-2 px-3 font-medium">
                              <div className="flex items-center gap-2.5">
                                <CategoryIcon
                                  iconKey={res.category.iconKey}
                                  className="size-6 rounded shrink-0"
                                />
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
                              <td className="py-2 px-3 text-[#94a3b8] font-mono whitespace-nowrap">
                                {res.site.name}
                              </td>
                            )}

                            <td className="py-2 px-3">
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

                            <td className="py-2 px-3">
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

                            <td className="py-2 px-3">
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

                            <td className="py-2 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {isDueSoon && (
                                  <BlockTimeButton
                                    actor={user}
                                    resource={{ id: res.id, siteId: res.site.id }}
                                    reason={
                                      res.calibrationStatus === "DUE_TODAY" ||
                                      res.calibrationStatus === "OVERDUE" ||
                                      res.calibrationStatus === "DUE_SOON"
                                        ? "Calibration"
                                        : "Service"
                                    }
                                    size="xs"
                                  />
                                )}
                                <Button
                                  asChild
                                  variant="outline"
                                  size="icon"
                                  className="size-9 rounded-md border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-[#94a3b8] hover:text-white shadow-2xs"
                                  title="View details"
                                  aria-label={`View details for ${res.name}`}
                                >
                                  <Link href={`/resources/${res.id}`}>
                                    <Eye className="size-4" />
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
                      Showing page {overview.page} of {overview.totalPages} ({overview.totalCount}{" "}
                      total)
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
                            href={`/equipment?tab=schedule&page=${overview.page - 1}${scheduleSiteId ? `&siteId=${scheduleSiteId}` : ""}${scheduleStatus ? `&status=${scheduleStatus}` : ""}`}
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
                            href={`/equipment?tab=schedule&page=${overview.page + 1}${scheduleSiteId ? `&siteId=${scheduleSiteId}` : ""}${scheduleStatus ? `&status=${scheduleStatus}` : ""}`}
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
      )}

      {/* Tab 3: Blocked time */}
      {activeTab === "blocked" && (
        <div className="space-y-4">
          {/* Sub-tabs & Admin Site Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#334155]/60 pb-3">
            {/* Sub-tabs: Upcoming vs Recent */}
            <div className="flex items-center gap-1 bg-[#060e1d] p-1 rounded-lg border border-[#334155]/60">
              <Link
                href={`/equipment?tab=blocked&range=upcoming${blockedSiteId ? `&siteId=${blockedSiteId}` : ""}`}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5",
                  blockedRange === "upcoming"
                    ? "bg-[#141c2b] text-white font-semibold shadow-xs border border-[#334155]"
                    : "text-[#879390] hover:text-white",
                )}
              >
                <Calendar className="size-3.5" />
                <span>Upcoming and current</span>
              </Link>
              <Link
                href={`/equipment?tab=blocked&range=recent${blockedSiteId ? `&siteId=${blockedSiteId}` : ""}`}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5",
                  blockedRange === "recent"
                    ? "bg-[#141c2b] text-white font-semibold shadow-xs border border-[#334155]"
                    : "text-[#879390] hover:text-white",
                )}
              >
                <History className="size-3.5" />
                <span>Recent</span>
              </Link>
            </div>

            {/* Admin Site Filter */}
            {isAdmin && sites.length > 0 && (
              <BlockedSiteFilter
                sites={sites}
                selectedSiteId={blockedSiteId}
                range={blockedRange}
              />
            )}
          </div>

          {/* Active filter indication for admin */}
          {isAdmin && currentBlockedSiteName && (
            <div className="text-xs font-mono text-[#879390] flex items-center gap-2">
              <span>
                Filtering by site: <strong className="text-white">{currentBlockedSiteName}</strong>
              </span>
              <Link
                href={`/equipment?tab=blocked&range=${blockedRange}`}
                className="text-[#6cd8cb] hover:underline ml-1"
              >
                Clear filter
              </Link>
            </div>
          )}

          {/* Main Blocks Table */}
          <MaintenanceTable blocks={blocks} canManageAny={true} isAdmin={isAdmin} />

          {/* Pagination */}
          {blocksTotalPages > 1 && (
            <PaginationControls
              currentPage={blockedPage}
              totalPages={blocksTotalPages}
              totalCount={blocksTotalCount}
              pageSize={blocksPageSize}
              basePath="/equipment"
              queryParams={{
                tab: "blocked",
                range: blockedRange,
                siteId: blockedSiteId,
              }}
            />
          )}
        </div>
      )}

      {/* Tab 4: Reports */}
      {activeTab === "reports" && reportResult && reportResult.ok && (
        <EquipmentReportsTab
          report={reportResult.data}
          isAdmin={isAdmin}
          sites={sites}
          sections={reportSections}
          categories={reportCategories}
          currentParams={params}
        />
      )}
    </div>
  );
}
