import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { SummaryStrip } from "@/components/summary-strip";
import { EmptyState } from "@/components/empty-state";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEquipmentDay } from "@/lib/equipment-status";
import type { LogRecordRow } from "@/services/equipment-report";

export interface EquipmentLogSectionProps {
  rows: LogRecordRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  counts: {
    total: number;
    pass: number;
    fail: number;
    notDone: number;
  };
  queryParams?: Record<string, string | undefined>;
  pdfDownloadUrl: string;
  csvDownloadUrl: string;
}

export function EquipmentLogSection({
  rows,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  counts,
  queryParams = {},
  pdfDownloadUrl,
  csvDownloadUrl,
}: EquipmentLogSectionProps) {
  return (
    <section className="space-y-4 pt-4 border-t border-[#334155]/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-[#7bd0ff]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Section B: Calibration & Service Log
          </h2>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-mono bg-[#141c2b] border-[#334155] text-white hover:bg-[#1e293b] hover:text-[#6cd8cb]"
          >
            <a href={csvDownloadUrl} download>
              <FileSpreadsheet className="size-3.5 mr-1.5 text-emerald-400" />
              <span>Download CSV</span>
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-mono bg-[#141c2b] border-[#334155] text-white hover:bg-[#1e293b] hover:text-[#7bd0ff]"
          >
            <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-3.5 mr-1.5 text-[#7bd0ff]" />
              <span>Download PDF</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Counts Strip */}
      <SummaryStrip
        items={[
          {
            label: "Total records",
            value: counts.total,
            hint: "In chosen date range",
          },
          {
            label: "Passed checks",
            value: counts.pass,
            dotColor: "primary",
            hint: "Passing calibrations & checks",
          },
          {
            label: "Failed checks",
            value: counts.fail,
            dotColor: "error",
            hint: "Led to Out of service",
          },
          {
            label: "Not done / deferred",
            value: counts.notDone,
            dotColor: "tertiary",
            hint: "Rescheduled with reason",
          },
        ]}
      />

      {/* Log Table */}
      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No service records found"
          description="There are no calibration or maintenance records matching the selected period and filters."
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#334155]/60 bg-[#060e1d]/80 shadow-xs overflow-x-auto max-w-full">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-[#141c2b]/80 border-b border-[#334155]/80">
                <TableRow className="border-b border-[#334155]/80 hover:bg-transparent">
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3 pl-4">Date</TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">
                    Equipment / Site
                  </TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Type</TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">
                    Performed by
                  </TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Work done</TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Result</TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">Next due</TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3">
                    Recorded by
                  </TableHead>
                  <TableHead className="text-xs font-mono text-[#94a3b8] py-3 pr-4 text-right">
                    PDF
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-[#334155]/40 hover:bg-[#141c2b]/50 transition-colors"
                  >
                    <TableCell className="py-3 pl-4 font-mono text-xs text-white whitespace-nowrap">
                      {formatEquipmentDay(row.date)}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs">
                      <Link
                        href={`/resources/${row.resourceId}`}
                        className="text-white hover:text-[#6cd8cb] font-medium transition-colors"
                      >
                        {row.resourceName}
                      </Link>
                      <div className="text-[11px] text-[#64748b]">
                        {row.siteName} {row.sectionName ? `• ${row.sectionName}` : ""}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs text-[#cbd5e1] whitespace-nowrap">
                      {row.kind.replace(/_/g, " ")}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs">
                      <div className="text-white">{row.performedBy}</div>
                      {row.externalCompany && (
                        <div className="text-[11px] text-[#94a3b8]">{row.externalCompany}</div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs text-[#94a3b8] max-w-[200px]">
                      <div className="truncate" title={row.workPerformed ?? undefined}>
                        {row.workPerformed || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs whitespace-nowrap">
                      {row.outcome === "PASS" && (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="size-3.5" /> Pass
                        </span>
                      )}
                      {row.outcome === "FAIL" && (
                        <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                          <XCircle className="size-3.5" /> Fail
                        </span>
                      )}
                      {row.outcome === "NOT_DONE" && (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                          <HelpCircle className="size-3.5" /> Not done
                        </span>
                      )}
                      {row.outcome === "REPLACE" && (
                        <span className="inline-flex items-center gap-1 text-rose-300 font-bold">
                          Replace
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs text-[#cbd5e1] whitespace-nowrap">
                      {row.nextDueOn ? formatEquipmentDay(row.nextDueOn) : "-"}
                    </TableCell>

                    <TableCell className="py-3 font-mono text-xs text-[#94a3b8] whitespace-nowrap">
                      {row.recordedByName}
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-right font-mono text-xs">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-[#7bd0ff] hover:text-white hover:bg-[#334155]/60"
                      >
                        <a
                          href={`/equipment/records/${row.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Service record PDF"
                        >
                          <FileText className="size-3.5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath="/equipment"
            queryParams={queryParams}
          />
        </div>
      )}
    </section>
  );
}
