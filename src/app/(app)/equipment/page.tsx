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
  CalendarDays,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listEquipmentOverview, listTodayTasks } from "@/services/equipment";
import { listBlocks } from "@/services/maintenance";
import { getEquipmentReport } from "@/services/equipment-report";
import { PageHeader } from "@/components/page-header";
import { StatRow, StatCard } from "@/components/ui/stat-card";
import { AttentionCard } from "@/components/ui/attention-card";
import { CategoryIcon } from "@/components/category-icon";
import { EquipmentStatusTag } from "@/components/equipment/equipment-status-tag";
import { MarkDoneDialog } from "@/components/equipment/mark-done-dialog";
import { MarkNotDoneDialog } from "@/components/equipment/mark-not-done-dialog";
import { BlockTimeButton } from "@/components/equipment/block-time-button";
import { EquipmentScheduleFilterBar } from "@/components/equipment/equipment-schedule-filter-bar";
import { BlockedSiteFilter } from "@/components/maintenance/blocked-site-filter";
import { MaintenanceTable } from "@/components/maintenance/maintenance-table";
import { EquipmentReportsTab } from "@/components/equipment/reports/equipment-reports-tab";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { dbToDay } from "@/lib/equipment-dates";
import { formatEquipmentDay, formatEquipmentStatusText } from "@/lib/equipment-status";
import { ensureDailyJobRan } from "@/services/daily-job";
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

  // Ensure daily job has been evaluated for equipment due dates and reminders
  void ensureDailyJobRan().catch((err) => {
    console.warn("[equipment/page] ensureDailyJobRan error:", err);
  });

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

  // Tab: Schedule
  const schedulePage = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const scheduleSiteId = params.siteId;
  const scheduleStatus = params.status;

  const overviewResult = await listEquipmentOverview(user, {
    siteId: scheduleSiteId,
    status: scheduleStatus,
    page: schedulePage,
    pageSize: activeTab === "schedule" ? 10 : 1,
  });

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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="BenchBook / Equipment care"
        title="Maintenance & care"
        description={
          isAdmin
            ? "Calibration, service and blocked time across every site."
            : "Calibration, service and blocked time for your site."
        }
        actions={
          <Button
            asChild
            className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs h-10 px-4 rounded-xl shadow-xs hover:opacity-95"
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

      {/* StatRow: 2x2 on phones, 4 cols on desktop matching 05 screen 6 */}
      <StatRow>
        <StatCard
          label="Due today"
          value={overview.counts.dueToday}
          hint={overview.counts.dueToday > 0 ? "Action required" : "All clear"}
          hintVariant={overview.counts.dueToday > 0 ? "warn" : "good"}
          icon={<Clock className="size-4 text-amber-strong" />}
        />
        <StatCard
          label="Overdue or failed"
          value={overview.counts.overdueOrFailed}
          hint={overview.counts.overdueOrFailed > 0 ? "Bookings blocked" : "None overdue"}
          hintVariant={overview.counts.overdueOrFailed > 0 ? "danger" : "good"}
          icon={<AlertCircle className="size-4 text-red" />}
        />
        <StatCard
          label="Due soon"
          value={overview.counts.dueSoon}
          hint="Next 30 days"
          hintVariant="muted"
          icon={<CalendarDays className="size-4 text-blue" />}
        />
        <StatCard
          label="Reviews due"
          value={overview.counts.replacementReviewsDue}
          hint="Lifecycle audits"
          hintVariant="muted"
          icon={<ClipboardCheck className="size-4 text-teal" />}
        />
      </StatRow>

      {/* Tabs Navigation (Horizontally scrolling on phones, segmented on desktop) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-line">
        <Link
          href="/equipment?tab=today"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0",
            activeTab === "today"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Today</span>
          {tasks.length > 0 && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold",
                activeTab === "today"
                  ? "bg-white text-teal-deep shadow-2xs"
                  : "bg-amber-soft text-amber border border-amber-line",
              )}
            >
              {tasks.length}
            </span>
          )}
        </Link>

        <Link
          href="/equipment?tab=schedule"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0",
            activeTab === "schedule"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Schedule</span>
        </Link>

        <Link
          href="/equipment?tab=blocked"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0",
            activeTab === "blocked"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Blocked time</span>
        </Link>

        <Link
          href="/equipment?tab=reports"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border shrink-0",
            activeTab === "reports"
              ? "bg-teal-soft border-teal-line text-teal-deep shadow-xs"
              : "bg-card border-card-edge text-muted hover:text-navy",
          )}
        >
          <span>Reports</span>
        </Link>
      </div>

      {/* Tab 1: Today Attention Cards */}
      {activeTab === "today" && (
        <div className="space-y-3.5">
          {tasks.length === 0 ? (
            <div className="rounded-[20px] bg-card border border-dashed border-card-edge p-12 text-center shadow-v4">
              <ClipboardCheck className="size-8 mx-auto mb-2 text-teal" />
              <h3 className="font-extrabold text-navy text-base">Nothing due today</h3>
              <p className="text-xs text-muted mt-1">
                All laboratory instruments and cabinets are up to date with their calibration and
                service schedules.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isOverdue = task.status === "OVERDUE";
                const trackerLabel = task.tracker === "calibration" ? "Calibration" : "Service";
                const formattedDue = formatEquipmentDay(task.dueOn);

                return (
                  <AttentionCard
                    key={task.id}
                    variant={isOverdue ? "danger" : "warn"}
                    icon={
                      isOverdue ? (
                        <AlertCircle className="size-4 text-red" />
                      ) : (
                        <Wrench className="size-4 text-amber-strong" />
                      )
                    }
                    title={
                      isOverdue
                        ? `${trackerLabel} overdue · ${task.daysOverdue} day${task.daysOverdue === 1 ? "" : "s"}`
                        : `${trackerLabel} due today`
                    }
                    subtitle={`${task.resourceName} · ${task.siteName ?? "Main Laboratory"}`}
                    hint={
                      isOverdue
                        ? "Bookings blocked until it's recorded"
                        : task.affectedBookingsCount > 0
                          ? `${task.affectedBookingsCount} bookings end after today (${formattedDue})`
                          : `Scheduled ${trackerLabel.toLowerCase()} (${formattedDue})`
                    }
                    actions={
                      <div className="flex flex-wrap items-center gap-2">
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
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Schedule Overview */}
      {activeTab === "schedule" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <EquipmentScheduleFilterBar
            isAdmin={isAdmin}
            sites={sites}
            currentSiteId={scheduleSiteId}
            currentStatus={scheduleStatus}
          />

          {/* Schedule Table / List */}
          <div className="rounded-[20px] bg-card border border-card-edge shadow-v4 overflow-hidden">
            {overview.items.length === 0 ? (
              <div className="py-12 text-center p-8 space-y-2">
                <ClipboardCheck className="size-8 text-muted mx-auto opacity-50" />
                <p className="text-sm font-bold text-navy">Nothing to track</p>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Add calibration or service details when you add or edit a resource.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas text-muted font-bold uppercase tracking-wider border-b border-line">
                    <tr>
                      <th className="py-3 px-4">Resource</th>
                      {isAdmin && <th className="py-3 px-4">Site</th>}
                      <th className="py-3 px-4">Calibration</th>
                      <th className="py-3 px-4">Maintenance</th>
                      <th className="py-3 px-4">Lifecycle review</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
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
                        <tr key={res.id} className="hover:bg-canvas/40 transition-colors">
                          <td className="py-3 px-4 font-medium">
                            <div className="flex items-center gap-2.5">
                              <CategoryIcon
                                iconKey={res.category.iconKey}
                                className="size-7 rounded-lg shrink-0"
                              />
                              <div>
                                <Link
                                  href={`/resources/${res.id}`}
                                  className="font-bold text-sm text-navy hover:text-teal transition-colors"
                                >
                                  {res.name}
                                </Link>
                                <div className="text-[11px] text-muted">
                                  {res.category.name} · {res.section.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 text-muted font-medium whitespace-nowrap">
                              {res.site.name}
                            </td>
                          )}

                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <EquipmentStatusTag status={res.calibrationStatus} />
                              <div className="text-[11px] text-muted">
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
                              <div className="text-[11px] text-muted">
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
                              <div className="text-[11px] text-muted">
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
                                className="size-8 rounded-lg border-card-edge bg-card hover:bg-canvas text-navy shadow-2xs"
                                title="View details"
                                aria-label={`View details for ${res.name}`}
                              >
                                <Link href={`/resources/${res.id}`}>
                                  <Eye className="size-3.5" />
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
            )}

            {/* Pagination footer */}
            {overview.totalPages > 1 && (
              <div className="p-3.5 border-t border-line bg-canvas/30 flex items-center justify-between text-xs text-muted">
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
                    className="h-8 gap-1 rounded-lg border-card-edge bg-card text-navy font-bold"
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
                    className="h-8 gap-1 rounded-lg border-card-edge bg-card text-navy font-bold"
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
        </div>
      )}

      {/* Tab 3: Blocked time */}
      {activeTab === "blocked" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
            {/* Sub-tabs: Upcoming vs Recent */}
            <div className="inline-flex rounded-full bg-canvas p-1 border border-line">
              <Link
                href={`/equipment?tab=blocked&range=upcoming${blockedSiteId ? `&siteId=${blockedSiteId}` : ""}`}
                className={cn(
                  "px-3.5 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5",
                  blockedRange === "upcoming"
                    ? "bg-teal text-white shadow-xs"
                    : "text-muted hover:text-navy",
                )}
              >
                <Calendar className="size-3.5" />
                <span>Upcoming and current</span>
              </Link>
              <Link
                href={`/equipment?tab=blocked&range=recent${blockedSiteId ? `&siteId=${blockedSiteId}` : ""}`}
                className={cn(
                  "px-3.5 py-1 text-xs font-bold rounded-full transition-all flex items-center gap-1.5",
                  blockedRange === "recent"
                    ? "bg-teal text-white shadow-xs"
                    : "text-muted hover:text-navy",
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
            <div className="text-xs text-muted flex items-center gap-2">
              <span>
                Filtering by site:{" "}
                <strong className="text-navy font-bold">{currentBlockedSiteName}</strong>
              </span>
              <Link
                href={`/equipment?tab=blocked&range=${blockedRange}`}
                className="text-teal hover:underline ml-1 font-bold"
              >
                Clear filter
              </Link>
            </div>
          )}

          {/* Main Blocks Table in card */}
          <div className="rounded-[20px] bg-card border border-card-edge shadow-v4 overflow-hidden">
            <MaintenanceTable blocks={blocks} canManageAny={true} isAdmin={isAdmin} />
          </div>

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
        <div className="rounded-[20px] bg-card border border-card-edge shadow-v4 p-5">
          <EquipmentReportsTab
            report={reportResult.data}
            isAdmin={isAdmin}
            sites={sites}
            sections={reportSections}
            categories={reportCategories}
            currentParams={params}
          />
        </div>
      )}
    </div>
  );
}
