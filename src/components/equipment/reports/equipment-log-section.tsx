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
    <section className="space-y-4 pt-4 border-t border-card-edge">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-teal" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Section B: Calibration & Service Log
          </h2>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold bg-card border-card-edge text-navy hover:bg-mint hover:text-teal rounded-xl shadow-2xs"
          >
            <a href={csvDownloadUrl} download>
              <FileSpreadsheet className="size-3.5 mr-1.5 text-teal" />
              <span>Download CSV</span>
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold bg-card border-card-edge text-navy hover:bg-mint hover:text-teal rounded-xl shadow-2xs"
          >
            <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
              <Download className="size-3.5 mr-1.5 text-teal" />
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
          <div className="rounded-2xl border border-card-edge bg-card shadow-v4 overflow-x-auto max-w-full">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-canvas/80 border-b border-card-edge">
                <TableRow className="border-b border-card-edge hover:bg-transparent">
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5 pl-4">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Equipment / Site
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Performed by
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Work done
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Result
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Next due
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5">
                    Recorded by
                  </TableHead>
                  <TableHead className="text-xs font-black uppercase tracking-wider text-navy/90 py-3.5 pr-4 text-right">
                    PDF
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="border-b border-card-edge hover:bg-mint/40 transition-colors"
                  >
                    <TableCell className="py-3 pl-4 text-xs text-navy font-bold whitespace-nowrap">
                      {formatEquipmentDay(row.date)}
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      <Link
                        href={`/resources/${row.resourceId}`}
                        className="text-navy hover:text-teal font-bold transition-colors block"
                      >
                        {row.resourceName}
                      </Link>
                      <div className="text-[11.5px] text-slate-700 font-medium">
                        {row.siteName} {row.sectionName ? `• ${row.sectionName}` : ""}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 font-bold text-xs text-navy whitespace-nowrap uppercase tracking-wider">
                      {row.kind.replace(/_/g, " ")}
                    </TableCell>

                    <TableCell className="py-3 text-xs">
                      <div className="text-navy font-bold">{row.performedBy}</div>
                      {row.externalCompany && (
                        <div className="text-[11.5px] text-slate-700 font-medium">
                          {row.externalCompany}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-xs text-slate-700 font-medium max-w-[200px]">
                      <div className="truncate" title={row.workPerformed ?? undefined}>
                        {row.workPerformed || "-"}
                      </div>
                    </TableCell>

                    <TableCell className="py-3 text-xs whitespace-nowrap">
                      {row.outcome === "PASS" && (
                        <span className="inline-flex items-center gap-1 text-green font-bold">
                          <CheckCircle2 className="size-3.5" /> Pass
                        </span>
                      )}
                      {row.outcome === "FAIL" && (
                        <span className="inline-flex items-center gap-1 text-red font-bold">
                          <XCircle className="size-3.5" /> Fail
                        </span>
                      )}
                      {row.outcome === "NOT_DONE" && (
                        <span className="inline-flex items-center gap-1 text-amber-strong font-bold">
                          <HelpCircle className="size-3.5" /> Not done
                        </span>
                      )}
                      {row.outcome === "REPLACE" && (
                        <span className="inline-flex items-center gap-1 text-red font-bold">
                          Replace
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="py-3 text-xs text-navy font-bold whitespace-nowrap">
                      {row.nextDueOn ? formatEquipmentDay(row.nextDueOn) : "-"}
                    </TableCell>

                    <TableCell className="py-3 text-xs text-slate-700 font-semibold whitespace-nowrap">
                      {row.recordedByName}
                    </TableCell>

                    <TableCell className="py-3 pr-4 text-right text-xs">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-teal hover:text-teal-deep hover:bg-mint"
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
