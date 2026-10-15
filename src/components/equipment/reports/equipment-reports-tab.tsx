"use client";

import * as React from "react";
import { EquipmentReportsFilterBar } from "./equipment-reports-filter-bar";
import { EquipmentConditionSection } from "./equipment-condition-section";
import { EquipmentLogSection } from "./equipment-log-section";
import type { EquipmentReportData } from "@/services/equipment-report";
import { Activity, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EquipmentReportsTabProps {
  report: EquipmentReportData;
  isAdmin: boolean;
  sites: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  currentParams: {
    from?: string;
    to?: string;
    site?: string;
    section?: string;
    category?: string;
    kind?: string;
    outcome?: string;
    page?: string;
  };
}

export function EquipmentReportsTab({
  report,
  isAdmin,
  sites,
  sections,
  categories,
  currentParams,
}: EquipmentReportsTabProps) {
  const [activeSection, setActiveSection] = React.useState<"all" | "condition" | "log">(
    "condition",
  );

  // Construct search params string for pagination base URL and downloads
  const baseParams = new URLSearchParams();
  baseParams.set("tab", "reports");
  if (currentParams.from) baseParams.set("from", currentParams.from);
  if (currentParams.to) baseParams.set("to", currentParams.to);
  if (currentParams.site && currentParams.site !== "all") {
    baseParams.set("site", currentParams.site);
  }
  if (currentParams.section && currentParams.section !== "all") {
    baseParams.set("section", currentParams.section);
  }
  if (currentParams.category && currentParams.category !== "all") {
    baseParams.set("category", currentParams.category);
  }
  if (currentParams.kind && currentParams.kind !== "all") {
    baseParams.set("kind", currentParams.kind);
  }
  if (currentParams.outcome && currentParams.outcome !== "all") {
    baseParams.set("outcome", currentParams.outcome);
  }

  // Download URLs
  const downloadParams = new URLSearchParams(baseParams);
  downloadParams.delete("tab");
  downloadParams.delete("page");

  const pdfDownloadUrl = `/equipment/reports/pdf?${downloadParams.toString()}`;
  const csvDownloadUrl = `/equipment/reports/export?${downloadParams.toString()}`;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <EquipmentReportsFilterBar
        isAdmin={isAdmin}
        sites={sites}
        sections={sections}
        categories={categories}
        currentFilters={currentParams}
      />

      {/* Section Toggle Pill Bar (Reduces large vertical scroll) */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-card-edge pb-3">
        <div className="inline-flex rounded-xl bg-canvas p-1 border border-card-edge gap-1">
          <button
            type="button"
            onClick={() => setActiveSection("condition")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeSection === "condition"
                ? "bg-teal text-white shadow-xs"
                : "text-muted hover:text-navy",
            )}
          >
            <Activity className="size-3.5" />
            <span>Section A: Condition ({report.conditionRows.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("log")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeSection === "log"
                ? "bg-teal text-white shadow-xs"
                : "text-muted hover:text-navy",
            )}
          >
            <FileText className="size-3.5" />
            <span>Section B: Service Log ({report.logTotalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("all")}
            className={cn(
              "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
              activeSection === "all"
                ? "bg-teal text-white shadow-xs"
                : "text-muted hover:text-navy",
            )}
          >
            <Layers className="size-3.5" />
            <span>View Both Sections</span>
          </button>
        </div>
      </div>

      {/* Section A: Equipment Condition */}
      {(activeSection === "all" || activeSection === "condition") && (
        <EquipmentConditionSection rows={report.conditionRows} counts={report.conditionCounts} />
      )}

      {/* Section B: Calibration & Service Log */}
      {(activeSection === "all" || activeSection === "log") && (
        <EquipmentLogSection
          rows={report.logRows}
          totalCount={report.logTotalCount}
          totalPages={report.logTotalPages}
          currentPage={report.logCurrentPage}
          pageSize={report.logPageSize}
          counts={report.logCounts}
          queryParams={{
            tab: "reports",
            from: currentParams.from,
            to: currentParams.to,
            site: currentParams.site,
            section: currentParams.section,
            category: currentParams.category,
            kind: currentParams.kind,
            outcome: currentParams.outcome,
          }}
          pdfDownloadUrl={pdfDownloadUrl}
          csvDownloadUrl={csvDownloadUrl}
        />
      )}
    </div>
  );
}
