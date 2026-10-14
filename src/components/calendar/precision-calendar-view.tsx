"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Shield,
  Plus,
  Wrench,
  AlertTriangle,
  Calendar as CalendarIcon,
  CalendarSearch,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PrecisionCalendarViewProps {
  user: {
    id: string;
    name: string;
    role: string;
    siteName?: string | null;
    siteId?: string | null;
  };
  resources: Array<{
    id: string;
    name: string;
    category: {
      name: string;
      iconKey: string;
    };
    site: {
      name: string;
    };
    section: {
      name: string;
    };
    location?: string | null;
    status: string;
  }>;
}

interface BookingBlock {
  id: string;
  resourceId: string;
  instrumentName: string;
  title: string;
  user: string;
  isCurrentUser: boolean;
  startHour: number;
  durationHours: number;
  kind: "CONFIRMED" | "MAINTENANCE" | "OUT_OF_SERVICE";
  statusBadge: string;
  attendees?: number;
}

const SAMPLE_SCHEDULE_DATA: BookingBlock[] = [
  {
    id: "b-1",
    resourceId: "pcr-1",
    instrumentName: "RT-PCR Machine 1",
    title: "COVID-19 Variant Assay (Batch 4)",
    user: "Kasun Silva",
    isCurrentUser: true,
    startHour: 9,
    durationHours: 2,
    kind: "CONFIRMED",
    statusBadge: "Active Run",
    attendees: 2,
  },
  {
    id: "b-2",
    resourceId: "pcr-1",
    instrumentName: "RT-PCR Machine 1",
    title: "Gene Expression Analysis",
    user: "Dr. Perera",
    isCurrentUser: false,
    startHour: 14,
    durationHours: 2,
    kind: "CONFIRMED",
    statusBadge: "Confirmed",
    attendees: 1,
  },
  {
    id: "b-3",
    resourceId: "pcr-2",
    instrumentName: "RT-PCR Machine 2",
    title: "RNA Extraction Quality Verification",
    user: "Kasun Silva",
    isCurrentUser: true,
    startHour: 10,
    durationHours: 2,
    kind: "CONFIRMED",
    statusBadge: "Active Run",
    attendees: 1,
  },
  {
    id: "b-4",
    resourceId: "pcr-2",
    instrumentName: "RT-PCR Machine 2",
    title: "Pathogen Screening",
    user: "Lab Tech Dissanayake",
    isCurrentUser: false,
    startHour: 13,
    durationHours: 3,
    kind: "CONFIRMED",
    statusBadge: "Confirmed",
    attendees: 3,
  },
  {
    id: "b-5",
    resourceId: "hplc-1",
    instrumentName: "HPLC System",
    title: "Toxicology Screening (Blood/Urine)",
    user: "Analytical Chemist Fonseka",
    isCurrentUser: false,
    startHour: 8,
    durationHours: 5,
    kind: "CONFIRMED",
    statusBadge: "Active Run",
    attendees: 2,
  },
  {
    id: "b-6",
    resourceId: "hplc-1",
    instrumentName: "HPLC System",
    title: "Quarterly Column Flush & Calibration",
    user: "Service Engineer",
    isCurrentUser: false,
    startHour: 14,
    durationHours: 2,
    kind: "MAINTENANCE",
    statusBadge: "Maintenance Block",
  },
  {
    id: "b-7",
    resourceId: "flow-1",
    instrumentName: "Flow Cytometer",
    title: "Safety Fault Lockout #INC-40992",
    user: "Beckman Field Service Dispatch",
    isCurrentUser: false,
    startHour: 8,
    durationHours: 10,
    kind: "OUT_OF_SERVICE",
    statusBadge: "Locked Out",
  },
  {
    id: "b-8",
    resourceId: "bio-1",
    instrumentName: "Biosafety Cabinet A",
    title: "Sterile Culture Inoculation",
    user: "Kasun Silva",
    isCurrentUser: true,
    startHour: 11,
    durationHours: 2,
    kind: "CONFIRMED",
    statusBadge: "Upcoming",
    attendees: 1,
  },
  {
    id: "b-9",
    resourceId: "bio-2",
    instrumentName: "Biosafety Cabinet B",
    title: "Cell Line Passage & Freezing",
    user: "Dr. Alwis",
    isCurrentUser: false,
    startHour: 9,
    durationHours: 4,
    kind: "CONFIRMED",
    statusBadge: "Active Run",
    attendees: 2,
  },
];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export function PrecisionCalendarView({ user, resources }: PrecisionCalendarViewProps) {
  const [selectedDate, setSelectedDate] = React.useState("2026-10-14");
  const [activeCategory, setActiveCategory] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"day" | "week">("day");
  const currentUserName = user?.name ?? "Staff Operator";

  // Determine display columns based on loaded or fallback resources
  const instruments = React.useMemo(() => {
    if (resources && resources.length > 0) {
      return resources.slice(0, 6).map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category.iconKey,
        room: r.location ?? `${r.section.name}`,
        discipline: r.category.name,
        status: r.status,
      }));
    }
    return [
      {
        id: "pcr-1",
        name: "RT-PCR Machine 1",
        category: "molecular",
        room: "Room 2.14",
        discipline: "Molecular Diagnostics",
        status: "ACTIVE",
      },
      {
        id: "pcr-2",
        name: "RT-PCR Machine 2",
        category: "molecular",
        room: "Room 2.14",
        discipline: "Molecular Diagnostics",
        status: "ACTIVE",
      },
      {
        id: "hplc-1",
        name: "HPLC System",
        category: "analytical",
        room: "Biochem Bench 4",
        discipline: "Clinical Biochemistry",
        status: "ACTIVE",
      },
      {
        id: "flow-1",
        name: "Flow Cytometer",
        category: "analytical",
        room: "Haematology Lab",
        discipline: "Haematology",
        status: "OUT_OF_SERVICE",
      },
      {
        id: "bio-1",
        name: "Biosafety Cabinet A",
        category: "biosafety",
        room: "Cleanroom 1",
        discipline: "Biosafety Units",
        status: "ACTIVE",
      },
      {
        id: "bio-2",
        name: "Biosafety Cabinet B",
        category: "biosafety",
        room: "Cleanroom 1",
        discipline: "Biosafety Units",
        status: "ACTIVE",
      },
    ];
  }, [resources]);

  const filteredInstruments = React.useMemo(() => {
    if (activeCategory === "all") return instruments;
    return instruments.filter((inst) => inst.category === activeCategory);
  }, [instruments, activeCategory]);

  const stepDate = (delta: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + delta);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const setToday = () => {
    setSelectedDate("2026-10-14");
  };

  const userRuns = React.useMemo(() => {
    return SAMPLE_SCHEDULE_DATA.filter((b) => b.isCurrentUser).map((b) => ({
      ...b,
      user: currentUserName,
    }));
  }, [currentUserName]);

  return (
    <div className="space-y-5">
      {/* 1. OPERATIONAL SUMMARY METRICS (4-Column Precision Strip) */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Metric 1: Operational Instruments */}
        <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
              Operational Instruments
            </span>
            <span className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-on-surface tabular-nums">5 / 6</span>
            <span className="font-mono text-xs text-primary font-semibold">83.3% Operational</span>
          </div>
          <div className="mt-2 text-xs text-on-surface-variant flex justify-between">
            <span>3 Booked, 2 Idle</span>
            <span className="text-error font-mono text-[11px]">1 Locked Out</span>
          </div>
        </div>

        {/* Metric 2: Today's Confirmed Runs */}
        <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-on-surface-variant uppercase tracking-wider">
              Today&apos;s Confirmed Runs
            </span>
            <CalendarIcon className="size-4 text-secondary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-on-surface tabular-nums">14 Runs</span>
            <span className="font-mono text-xs text-secondary font-semibold">Clash-free</span>
          </div>
          <div className="mt-2 text-xs text-on-surface-variant flex justify-between">
            <span>3 Active in Lab</span>
            <span className="text-primary font-medium">{userRuns.length} by You</span>
          </div>
        </div>

        {/* Metric 3: Scheduled Maintenance */}
        <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant flex flex-col justify-between shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-tertiary uppercase tracking-wider">
              Scheduled Maintenance
            </span>
            <Wrench className="size-4 text-tertiary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-tertiary tabular-nums">1 Block</span>
            <span className="font-mono text-xs text-tertiary">14:00–16:00</span>
          </div>
          <div className="mt-2 text-xs text-on-surface-variant truncate">
            Quarterly Column Flush & Calibration
          </div>
        </div>

        {/* Metric 4: Fault Lockout */}
        <div className="p-3.5 rounded-lg bg-surface-container border border-error/40 flex flex-col justify-between bg-error-container/10 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-error uppercase tracking-wider font-semibold">
              Fault Lockout
            </span>
            <AlertTriangle className="size-4 text-error" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-error tabular-nums">1 Unit Locked</span>
            <span className="font-mono text-xs text-error/80">#INC-40992</span>
          </div>
          <div className="mt-2 text-xs text-on-surface-variant truncate">
            Flow Cytometer • Beckman Field Rep ETA 13:30
          </div>
        </div>
      </section>

      {/* 2. HIGH-PRECISION DAY-VIEW TIMETABLE & BENCH SHEET */}
      <section className="rounded-lg bg-surface-container border border-outline-variant flex flex-col shadow-sm">
        {/* Timetable Navigation Toolbar */}
        <div className="p-3 border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 bg-surface-container-low">
          {/* Left Controls: Date Scrubbers with Active Date Input */}
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-md bg-surface-container-lowest p-0.5 border border-outline-variant text-xs">
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  viewMode === "day"
                    ? "bg-surface-container-high text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                onClick={() => setViewMode("day")}
              >
                Day View
              </button>
              <button
                type="button"
                className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                  viewMode === "week"
                    ? "bg-surface-container-high text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                onClick={() => setViewMode("week")}
              >
                Week View
              </button>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant transition-colors"
                onClick={() => stepDate(-1)}
                title="Previous Day"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface font-semibold border border-outline-variant hover:bg-surface-container-highest transition-colors"
                onClick={setToday}
              >
                Today
              </button>
              <button
                type="button"
                className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant transition-colors"
                onClick={() => stepDate(1)}
                title="Next Day"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 pl-2">
              <input
                type="date"
                value={selectedDate}
                className="bg-surface-container-lowest border border-outline-variant text-on-surface font-mono text-xs px-2.5 py-1 rounded outline-none focus:border-primary"
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Shift 1 • Core Lab
              </span>
            </div>
          </div>

          {/* Right Controls: Category Filter Tabs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-on-surface-variant font-mono text-[11px]">Discipline:</span>
            <div className="flex items-center gap-1 font-mono text-[11px]">
              {(
                [
                  { key: "all", label: "All (6)" },
                  { key: "molecular", label: "Molecular (2)" },
                  { key: "analytical", label: "Analytical (2)" },
                  { key: "biosafety", label: "Biosafety (2)" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeCategory === tab.key
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant border border-outline-variant"
                  }`}
                  onClick={() => setActiveCategory(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Find a slot secondary entry point */}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs font-mono bg-surface-container-lowest hover:bg-surface-container border-outline-variant text-primary font-semibold"
            >
              <Link
                href={`/book?date=${selectedDate}${user.siteId ? `&siteId=${user.siteId}` : ""}`}
              >
                <CalendarSearch className="size-3.5 mr-1.5" />
                <span>Find a slot</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Schedule Matrix Container */}
        <div className="overflow-x-auto relative">
          <div className="min-w-[1050px] flex flex-col">
            {/* Column Header Row */}
            <div className="flex border-b border-outline-variant bg-surface-container-lowest sticky top-0 z-20">
              <div className="w-20 flex-shrink-0 p-2.5 border-r border-outline-variant font-mono text-[11px] text-outline flex items-center justify-center font-bold">
                TIME
              </div>
              {filteredInstruments.map((inst) => {
                const isFaulted = inst.status === "OUT_OF_SERVICE";
                return (
                  <div
                    key={inst.id}
                    className={`flex-1 min-w-[160px] p-2.5 border-r border-outline-variant flex flex-col justify-center ${
                      isFaulted ? "bg-error-container/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`font-semibold text-xs truncate ${
                          isFaulted ? "text-error" : "text-on-surface"
                        }`}
                      >
                        {inst.name}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isFaulted
                            ? "bg-error ring-2 ring-error/30"
                            : inst.category === "analytical"
                              ? "bg-tertiary"
                              : "bg-primary"
                        }`}
                        title={isFaulted ? "Fault Lockout" : "Online"}
                      />
                    </div>
                    <div
                      className={`font-mono text-[10px] truncate ${
                        isFaulted ? "text-error/80" : "text-on-surface-variant"
                      }`}
                    >
                      {inst.room} • {inst.discipline}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots Rows */}
            <div className="divide-y divide-outline-variant/40 bg-surface">
              {TIME_SLOTS.map((time, slotIdx) => {
                const hour = 8 + slotIdx;

                return (
                  <div
                    key={time}
                    className="flex min-h-[58px] hover:bg-surface-container/20 transition-colors"
                  >
                    {/* Time cell */}
                    <div className="w-20 flex-shrink-0 p-2.5 border-r border-outline-variant font-mono text-xs text-on-surface-variant flex items-center justify-center font-bold bg-surface-container-low">
                      {time}
                    </div>

                    {/* Columns */}
                    {filteredInstruments.map((inst) => {
                      const isFaulted = inst.status === "OUT_OF_SERVICE";

                      // Find matching booking that starts at this hour or spans this hour
                      const block = SAMPLE_SCHEDULE_DATA.find((b) => {
                        const matchesInst =
                          b.instrumentName
                            .toLowerCase()
                            .includes(inst.name.toLowerCase().slice(0, 8)) ||
                          b.resourceId === inst.id;
                        return (
                          matchesInst && hour >= b.startHour && hour < b.startHour + b.durationHours
                        );
                      });

                      const isFirstHour = block && block.startHour === hour;

                      if (isFaulted) {
                        return (
                          <div
                            key={inst.id}
                            className="flex-1 min-w-[160px] p-2 border-r border-outline-variant/60 out-of-service-stripes flex items-center justify-center text-center"
                          >
                            {hour === 8 && (
                              <span className="font-mono text-[10px] font-bold text-error bg-surface-container-lowest/80 px-2 py-0.5 rounded border border-error/40">
                                LOCKOUT #INC-40992
                              </span>
                            )}
                          </div>
                        );
                      }

                      if (block) {
                        if (!isFirstHour) {
                          // Continuation slot
                          return (
                            <div
                              key={inst.id}
                              className={`flex-1 min-w-[160px] p-1.5 border-r border-outline-variant/60 ${
                                block.kind === "MAINTENANCE"
                                  ? "hazard-hatch-pattern border-l-2 border-l-tertiary"
                                  : block.isCurrentUser
                                    ? "bg-surface-container-high border-l-2 border-l-primary"
                                    : "bg-surface-container border-l-2 border-l-secondary"
                              }`}
                            />
                          );
                        }

                        // First slot of block
                        return (
                          <div
                            key={inst.id}
                            className={`flex-1 min-w-[160px] p-2 border-r border-outline-variant/60 flex flex-col justify-between ${
                              block.kind === "MAINTENANCE"
                                ? "hazard-hatch-pattern border-l-2 border-l-tertiary border border-tertiary/40 rounded-sm"
                                : block.isCurrentUser
                                  ? "bg-surface-container-high border-l-2 border-l-primary border border-primary/40 rounded-sm"
                                  : "bg-surface-container border-l-2 border-l-secondary border border-outline-variant rounded-sm"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`font-mono text-[10.5px] font-bold truncate ${
                                  block.kind === "MAINTENANCE"
                                    ? "text-tertiary"
                                    : block.isCurrentUser
                                      ? "text-primary"
                                      : "text-secondary"
                                }`}
                              >
                                {block.title}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono mt-1">
                              <span className="truncate">{block.user}</span>
                              <span className="text-outline tabular-nums">
                                {block.durationHours}h block
                              </span>
                            </div>
                          </div>
                        );
                      }

                      // Empty / Available Slot
                      return (
                        <div
                          key={inst.id}
                          className="flex-1 min-w-[160px] p-1 border-r border-outline-variant/60 group relative flex items-center justify-center hover:bg-surface-container/50 transition-colors"
                        >
                          <Link
                            href={`/resources`}
                            className="hidden group-hover:inline-flex items-center gap-1 font-mono text-[10px] text-primary bg-surface-container-lowest/90 px-2 py-1 rounded border border-primary/40 shadow-xs"
                          >
                            <Plus className="size-3" />
                            <span>Available</span>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Schedule Legend */}
        <div className="p-3 border-t border-outline-variant bg-surface-container-low flex flex-wrap items-center justify-between gap-4 font-mono text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-surface-container-high border-l-2 border-l-primary border border-primary/40" />
              <span className="text-primary font-semibold">Your Booking [YOU]</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-surface-container border-l-2 border-l-secondary border border-outline-variant" />
              <span className="text-on-surface-variant">Colleague Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3 rounded-sm hazard-hatch-pattern border-l-2 border-l-tertiary border border-tertiary/40" />
              <span className="text-tertiary">Maintenance Block</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3 rounded-sm out-of-service-stripes border border-error/50" />
              <span className="text-error">Out of Service Lockout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm border border-dashed border-outline-variant" />
              <span className="text-on-surface-variant">Available Slot</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-outline text-[10px]">
            <Shield className="size-3.5 text-primary" />
            <span>Database GiST Rule: No simultaneous double-bookings permitted</span>
          </div>
        </div>
      </section>

      {/* 3. PERSONAL SCHEDULED RUNS & PRACTICAL INSTRUMENT READINESS MATRIX */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Left: Your Scheduled Runs */}
        <div className="xl:col-span-2 rounded-lg bg-surface-container border border-outline-variant flex flex-col shadow-sm">
          <div className="p-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" />
              <h2 className="font-semibold text-on-surface text-sm">Your Scheduled Runs</h2>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[11px] font-bold">
                {userRuns.length} Runs
              </span>
            </div>
            <span className="font-mono text-[11px] text-on-surface-variant">
              Wednesday, 14 Oct 2026
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                  <th className="p-3">Time Window</th>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Assay / Protocol</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {userRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-surface-container-high/60 transition-colors">
                    <td className="p-3 font-mono text-primary font-bold tabular-nums">
                      {String(run.startHour).padStart(2, "0")}:00 –{" "}
                      {String(run.startHour + run.durationHours).padStart(2, "0")}:00
                    </td>
                    <td className="p-3 font-semibold text-on-surface">{run.instrumentName}</td>
                    <td className="p-3 text-on-surface-variant font-mono text-[11px]">
                      {run.title}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono text-[10px] font-bold">
                        <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                        <span>{run.statusBadge}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                      >
                        <Link href="/resources">Details</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Practical Instrument Readiness */}
        <div className="rounded-lg bg-surface-container border border-outline-variant flex flex-col shadow-sm">
          <div className="p-3 border-b border-outline-variant flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" />
              <h2 className="font-semibold text-on-surface text-sm">Instrument Readiness</h2>
            </div>
            <span className="font-mono text-[10px] text-on-surface-variant">Operational State</span>
          </div>
          <div className="p-3 flex flex-col gap-2.5 text-xs">
            {/* RT-PCR 1 */}
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-on-surface">Real-time PCR Machine 1</span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Room 2.14 • Next free: 14:00
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 font-mono text-[10px] font-bold">
                ACTIVE RUN
              </span>
            </div>
            {/* RT-PCR 2 */}
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-on-surface">Real-time PCR Machine 2</span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Room 2.14 • Free until 14:00
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 font-mono text-[10px] font-bold">
                AVAILABLE
              </span>
            </div>
            {/* HPLC System */}
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-on-surface">HPLC System #4</span>
                <span className="font-mono text-[10px] text-tertiary">
                  Maint block: 14:00–16:00
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary border border-tertiary/25 font-mono text-[10px] font-bold">
                MAINT PENDING
              </span>
            </div>
            {/* Flow Cytometer (Fault) */}
            <div className="p-2.5 rounded bg-surface-container-low border border-error/40 flex items-center justify-between bg-error-container/10">
              <div className="flex flex-col">
                <span className="font-semibold text-error">Flow Cytometer #1</span>
                <span className="font-mono text-[10px] text-error/80">
                  Fault #INC-40992 • Rep dispatched
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-error text-on-error font-mono text-[10px] font-bold">
                LOCKOUT
              </span>
            </div>
            {/* Biosafety Cabinets */}
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-semibold text-on-surface">Biosafety Cabinets A & B</span>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  Annual HEPA check certified
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25 font-mono text-[10px] font-bold">
                OPTIMAL
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
