import * as React from "react";
import { Building } from "lucide-react";
import type { SectionUsage } from "@/services/usage";

export interface SectionUsageChartProps {
  sections: SectionUsage[];
}

export function SectionUsageChart({ sections }: SectionUsageChartProps) {
  const maxMinutes = sections.length > 0 ? Math.max(...sections.map((s) => s.minutes), 1) : 1;
  const totalMinutes = sections.reduce((acc, s) => acc + s.minutes, 0);

  return (
    <div className="rounded-2xl bg-card border border-card-edge p-5 shadow-v4 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Building className="size-4 text-teal" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">Use by section</h2>
        </div>
        <span className="text-xs text-muted">
          {sections.length} active section{sections.length === 1 ? "" : "s"}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted">
          No section usage recorded in this period.
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {sections.map((s) => {
            const hours = Math.round((s.minutes / 60) * 10) / 10;
            const barPercent = Math.max(4, Math.round((s.minutes / maxMinutes) * 100));
            const sharePercent =
              totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 100) : 0;

            return (
              <div key={s.section} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-navy truncate">{s.section}</span>
                  <span className="text-muted tab shrink-0 ml-2 font-semibold">
                    {hours} h{" "}
                    <span className="text-[11px] text-faint font-normal">({sharePercent}%)</span>
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-card-edge/70 border border-line overflow-hidden">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-300"
                    style={{ width: `${barPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Visually hidden table for screen readers */}
      <table className="sr-only">
        <caption>Booking distribution by laboratory section</caption>
        <thead>
          <tr>
            <th scope="col">Section</th>
            <th scope="col">Booked hours</th>
            <th scope="col">Booked minutes</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s) => (
            <tr key={s.section}>
              <td>{s.section}</td>
              <td>{(s.minutes / 60).toFixed(1)}</td>
              <td>{s.minutes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
