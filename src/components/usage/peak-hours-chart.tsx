import * as React from "react";
import { Clock } from "lucide-react";
import type { PeakHoursData } from "@/services/usage";

export interface PeakHoursChartProps {
  data: PeakHoursData;
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  const { hourlyMinutes, busiestHourIndex, busiestHourLabel, busiestHourMinutes } = data;
  const maxMinutes = Math.max(...hourlyMinutes, 1);

  return (
    <div className="rounded-2xl bg-card border border-card-edge p-5 shadow-v4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-teal" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Peak hours
          </h2>
        </div>
        <div className="text-xs text-muted">
          {busiestHourMinutes > 0 ? (
            <span>
              Busiest hour: <strong className="text-teal-deep font-bold">{busiestHourLabel}</strong> (
              {Math.round((busiestHourMinutes / 60) * 10) / 10} h booked)
            </span>
          ) : (
            <span>No bookings recorded in this period.</span>
          )}
        </div>
      </div>

      {/* 24-Hour Vertical CSS Bars */}
      <div
        role="img"
        aria-label={`Peak hours chart. Busiest hour is ${busiestHourLabel} with ${busiestHourMinutes} minutes booked.`}
        className="pt-6 pb-2"
      >
        <div className="h-40 flex items-end gap-1 sm:gap-1.5 w-full">
          {hourlyMinutes.map((mins, hour) => {
            const heightPercent = mins > 0 ? Math.max(8, Math.round((mins / maxMinutes) * 100)) : 3;
            const isBusiest = hour === busiestHourIndex && mins > 0;
            const hourLabel = `${String(hour).padStart(2, "0")}:00`;

            return (
              <div
                key={hour}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-8 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                  <div className="bg-navy text-white rounded-lg px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-md">
                    {hourLabel}: {Math.round((mins / 60) * 10) / 10} h ({mins}m)
                  </div>
                </div>

                {/* Vertical Bar */}
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isBusiest
                      ? "bg-teal shadow-xs"
                      : mins > 0
                        ? "bg-teal/70 hover:bg-teal"
                        : "bg-card-edge/50"
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis Hour Labels (Every 2 hours) */}
        <div className="flex justify-between text-[10px] text-muted pt-2 border-t border-line mt-1 font-medium">
          {Array.from({ length: 12 }).map((_, i) => {
            const hour = i * 2;
            return <span key={hour}>{String(hour).padStart(2, "0")}:00</span>;
          })}
          <span>24:00</span>
        </div>
      </div>

      {/* Visually hidden table for screen readers */}
      <table className="sr-only">
        <caption>Hourly distribution of bookings across 24 hours</caption>
        <thead>
          <tr>
            <th scope="col">Hour</th>
            <th scope="col">Booked minutes</th>
          </tr>
        </thead>
        <tbody>
          {hourlyMinutes.map((mins, hour) => (
            <tr key={hour}>
              <td>{`${String(hour).padStart(2, "0")}:00 - ${String((hour + 1) % 24).padStart(2, "0")}:00`}</td>
              <td>{mins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
