import * as React from "react";
import Link from "next/link";
import { Activity, ExternalLink, Wrench } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { ConditionTag } from "@/components/equipment/condition-tag";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { SummaryStrip } from "@/components/summary-strip";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEquipmentDay } from "@/lib/equipment-status";
import type { ConditionRow } from "@/services/equipment-report";

export interface EquipmentConditionSectionProps {
  rows: ConditionRow[];
  counts: {
    poor: number;
    watch: number;
    good: number;
    notTracked: number;
    total: number;
  };
}

export function EquipmentConditionSection({ rows, counts }: EquipmentConditionSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-teal" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Section A: Current Equipment Condition
          </h2>
        </div>
        <span className="text-xs font-bold text-muted">
          {counts.total} {counts.total === 1 ? "asset" : "assets"} in scope
        </span>
      </div>

      {/* Summary Counts Strip */}
      <SummaryStrip
        items={[
          {
            label: "Poor condition",
            value: counts.poor,
            dotColor: "error",
            hint: "Immediate intervention needed",
          },
          {
            label: "Watch list",
            value: counts.watch,
            dotColor: "tertiary",
            hint: "Due soon or recent failures",
          },
          {
            label: "Good condition",
            value: counts.good,
            dotColor: "primary",
            hint: "All schedules & checks current",
          },
          {
            label: "Not tracked",
            value: counts.notTracked,
            hint: "No active care schedules",
          },
        ]}
      />

      {/* Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No equipment found"
          description="There are no resources matching the current filters."
        />
      ) : (
        <div className="rounded-2xl border border-card-edge bg-card shadow-v4 overflow-x-auto max-w-full">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-canvas/80 border-b border-card-edge">
              <TableRow className="border-b border-card-edge hover:bg-transparent">
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5 pl-4">
                  Equipment
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                  Site / Section
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                  Status
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                  Condition & Reasons
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                  Calibration
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                  Service
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5 text-right">
                  12m History
                </TableHead>
                <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5 pr-4 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const calDays = row.calibrationDaysRemaining;
                const srvDays = row.serviceDaysRemaining;

                return (
                  <TableRow
                    key={row.resourceId}
                    className="border-b border-card-edge hover:bg-mint/40 transition-colors"
                  >
                    <TableCell className="py-3 pl-4">
                      <Link
                        href={`/resources/${row.resourceId}`}
                        className="group flex items-center gap-2.5 font-semibold text-navy hover:text-teal transition-colors"
                      >
                        <CategoryIcon
                          iconKey={row.categoryIcon}
                          className="size-5 rounded shrink-0"
                        />
                        <div>
                          <span className="truncate max-w-[180px] block font-bold text-navy group-hover:text-teal text-xs">
                            {row.name}
                          </span>
                          <span className="text-[11.5px] text-slate-600 block font-medium">
                            {row.categoryName}
                          </span>
                        </div>
                      </Link>
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      <div className="text-navy font-bold">{row.siteName}</div>
                      <div className="text-[11.5px] text-slate-700 font-medium">
                        {row.sectionName ?? "General"}
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <ResourceStatusTag status={row.status} />
                    </TableCell>

                    <TableCell className="py-3 max-w-[260px]">
                      <div className="space-y-1">
                        <ConditionTag condition={row.condition} />
                        {row.reasons.length > 0 && (
                          <div className="text-[11.5px] text-slate-700 font-medium space-y-0.5">
                            {row.reasons.map((r, i) => (
                              <div key={i} className="truncate" title={r}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      {row.nextCalibrationDue ? (
                        <div className="space-y-0.5">
                          <div className="text-navy font-bold flex items-center gap-1.5 flex-wrap">
                            <span>Due {formatEquipmentDay(row.nextCalibrationDue)}</span>
                            {calDays !== null && (
                              <span
                                className={
                                  calDays < 0
                                    ? "text-red font-bold"
                                    : calDays <= 7
                                      ? "text-amber-strong font-bold"
                                      : "text-navy/70 font-semibold"
                                }
                              >
                                (
                                {calDays < 0 ? `Overdue ${Math.abs(calDays)}d` : `${calDays}d left`}
                                )
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-600 font-medium">
                            {row.lastCalibrationDate
                              ? `Last: ${formatEquipmentDay(row.lastCalibrationDate)} (${row.lastCalibrationResult})`
                              : "No previous records"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11.5px] italic font-medium">
                          Not configured
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      {row.nextServiceDue ? (
                        <div className="space-y-0.5">
                          <div className="text-navy font-bold flex items-center gap-1.5 flex-wrap">
                            <span>Due {formatEquipmentDay(row.nextServiceDue)}</span>
                            {srvDays !== null && (
                              <span
                                className={
                                  srvDays < 0
                                    ? "text-red font-bold"
                                    : srvDays <= 14
                                      ? "text-amber-strong font-bold"
                                      : "text-navy/70 font-semibold"
                                }
                              >
                                (
                                {srvDays < 0 ? `Overdue ${Math.abs(srvDays)}d` : `${srvDays}d left`}
                                )
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] text-slate-600 font-medium">
                            {row.lastServiceDate
                              ? `Last: ${formatEquipmentDay(row.lastServiceDate)} (${row.lastServiceResult})`
                              : "No previous records"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11.5px] italic font-medium">
                          Not configured
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs">
                      {row.failuresIn12Months > 0 || row.repairsIn12Months > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-soft text-amber-strong border border-amber-line">
                          {row.failuresIn12Months} fails, {row.repairsIn12Months} rep
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs font-medium">0 fails, 0 rep</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/resources/${row.resourceId}`}
                          className="inline-flex items-center gap-1 text-xs text-navy font-bold px-2.5 py-1.5 rounded-lg bg-card hover:bg-canvas border border-card-edge shadow-2xs transition-colors"
                          title="View resource details"
                        >
                          <ExternalLink className="size-3 text-navy" />
                          <span>View</span>
                        </Link>
                        <Link
                          href={`/equipment?tab=all&resourceId=${row.resourceId}`}
                          className="inline-flex items-center gap-1 text-xs text-teal font-bold px-2.5 py-1.5 rounded-lg bg-teal-soft hover:bg-mint border border-teal-line shadow-2xs transition-colors"
                          title="Record care or view history"
                        >
                          <Wrench className="size-3 text-teal" />
                          <span>Care</span>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
