import * as React from "react";
import { EquipmentReportsFilterBar } from "./equipment-reports-filter-bar";
import { EquipmentConditionSection } from "./equipment-condition-section";
import { EquipmentLogSection } from "./equipment-log-section";
import type { EquipmentReportData } from "@/services/equipment-report";

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

      {/* Section A: Equipment Condition */}
      <EquipmentConditionSection rows={report.conditionRows} counts={report.conditionCounts} />

      {/* Section B: Calibration & Service Log */}
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
    </div>
  );
}
