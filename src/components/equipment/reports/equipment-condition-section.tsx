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
          <Activity className="size-4 text-[#6cd8cb]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Section A: Current Equipment Condition
          </h2>
        </div>
        <span className="text-xs font-mono text-[#94a3b8]">
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
        <div className="rounded-xl border border-[#334155]/60 bg-[#060e1d]/80 shadow-xs overflow-x-auto max-w-full">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-[#141c2b]/80 border-b border-[#334155]/80">
              <TableRow className="border-b border-[#334155]/80 hover:bg-transparent">
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3 pl-4">
                  Equipment
                </TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3">
                  Site / Section
                </TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Status</TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3">
                  Condition & Reasons
                </TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Calibration</TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Service</TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3 text-right">
                  12m History
                </TableHead>
                <TableHead className="text-xs font-mono text-[#94a3b8] py-3 pr-4 text-right">
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
                    className="border-b border-[#334155]/40 hover:bg-[#141c2b]/50 transition-colors"
                  >
                    <TableCell className="py-3 pl-4 font-mono">
                      <Link
                        href={`/resources/${row.resourceId}`}
                        className="group flex items-center gap-2.5 font-medium text-white hover:text-[#6cd8cb] transition-colors"
                      >
                        <CategoryIcon
                          iconKey={row.categoryIcon}
                          className="size-4 text-[#879390] group-hover:text-[#6cd8cb] shrink-0"
                        />
                        <div>
                          <span className="truncate max-w-[180px] block font-medium">
                            {row.name}
                          </span>
                          <span className="text-[11px] text-[#64748b] block font-sans">
                            {row.categoryName}
                          </span>
                        </div>
                      </Link>
                    </TableCell>

                    <TableCell className="py-3 text-xs font-mono text-[#94a3b8]">
                      <div className="text-white font-medium">{row.siteName}</div>
                      <div className="text-[11px] text-[#64748b]">
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
                          <div className="text-[11px] font-mono text-[#94a3b8] space-y-0.5">
                            {row.reasons.map((r, i) => (
                              <div key={i} className="truncate" title={r}>
                                • {r}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-xs font-mono">
                      {row.nextCalibrationDue ? (
                        <div className="space-y-0.5">
                          <div className="text-white flex items-center gap-1.5 flex-wrap">
                            <span>Due {formatEquipmentDay(row.nextCalibrationDue)}</span>
                            {calDays !== null && (
                              <span
                                className={
                                  calDays < 0
                                    ? "text-rose-400 font-semibold"
                                    : calDays <= 7
                                      ? "text-amber-300 font-semibold"
                                      : "text-[#94a3b8]"
                                }
                              >
                                (
                                {calDays < 0 ? `Overdue ${Math.abs(calDays)}d` : `${calDays}d left`}
                                )
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748b]">
                            {row.lastCalibrationDate
                              ? `Last: ${formatEquipmentDay(row.lastCalibrationDate)} (${row.lastCalibrationResult})`
                              : "No previous records"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#64748b] text-[11px] italic">Not configured</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-xs font-mono">
                      {row.nextServiceDue ? (
                        <div className="space-y-0.5">
                          <div className="text-white flex items-center gap-1.5 flex-wrap">
                            <span>Due {formatEquipmentDay(row.nextServiceDue)}</span>
                            {srvDays !== null && (
                              <span
                                className={
                                  srvDays < 0
                                    ? "text-rose-400 font-semibold"
                                    : srvDays <= 14
                                      ? "text-amber-300 font-semibold"
                                      : "text-[#94a3b8]"
                                }
                              >
                                (
                                {srvDays < 0 ? `Overdue ${Math.abs(srvDays)}d` : `${srvDays}d left`}
                                )
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#64748b]">
                            {row.lastServiceDate
                              ? `Last: ${formatEquipmentDay(row.lastServiceDate)} (${row.lastServiceResult})`
                              : "No previous records"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#64748b] text-[11px] italic">Not configured</span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-right text-xs font-mono">
                      <span
                        className={
                          row.failuresIn12Months > 0 || row.repairsIn12Months > 0
                            ? "text-amber-300 font-semibold"
                            : "text-[#64748b]"
                        }
                      >
                        {row.failuresIn12Months} fails, {row.repairsIn12Months} rep
                      </span>
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/resources/${row.resourceId}`}
                          className="inline-flex items-center gap-1 text-xs text-[#94a3b8] hover:text-white px-2 py-1 rounded bg-[#1e293b]/50 hover:bg-[#1e293b] border border-[#334155]/50 transition-colors"
                          title="View resource details"
                        >
                          <ExternalLink className="size-3" />
                          <span>View</span>
                        </Link>
                        <Link
                          href={`/equipment?tab=all&resourceId=${row.resourceId}`}
                          className="inline-flex items-center gap-1 text-xs text-[#6cd8cb] hover:text-white px-2 py-1 rounded bg-[#6cd8cb]/10 hover:bg-[#6cd8cb]/20 border border-[#6cd8cb]/30 transition-colors"
                          title="Record care or view history"
                        >
                          <Wrench className="size-3" />
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
