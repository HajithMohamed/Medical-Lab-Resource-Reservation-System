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
    <div className="rounded-2xl bg-[#0f172a]/70 border border-[#1e293b] p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2">
          <Building className="size-4 text-[#6cd8cb]" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Use by section
          </h2>
        </div>
        <span className="text-xs font-mono text-[#94a3b8]">
          {sections.length} active section{sections.length === 1 ? "" : "s"}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#94a3b8] font-mono">
          No section usage recorded in this period.
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {sections.map((s) => {
            const hours = Math.round((s.minutes / 60) * 10) / 10;
            const barPercent = Math.max(4, Math.round((s.minutes / maxMinutes) * 100));
            const sharePercent =
              totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 100) : 0;

            return (
              <div key={s.section} className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-200">
                  <span className="font-semibold text-white truncate">{s.section}</span>
                  <span className="text-[#94a3b8] tabular-nums shrink-0 ml-2">
                    {hours} h <span className="text-[11px] text-[#64748b]">({sharePercent}%)</span>
                  </span>
                </div>

                <div className="h-3 w-full rounded-full bg-[#060e1d] border border-[#334155]/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0E6A85] hover:bg-[#1282a3] transition-all duration-300"
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
