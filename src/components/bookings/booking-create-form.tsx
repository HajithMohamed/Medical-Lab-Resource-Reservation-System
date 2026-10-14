"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Calendar, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { createBookingAction } from "@/actions/bookings";
import { CategoryIcon } from "@/components/category-icon";
import { format } from "date-fns";
import { formatMinutes } from "@/lib/format";
import { SLOT_MINUTES, CALIBRATION_DUE_SOON_DAYS } from "@/config/rules";
import { dbToDay } from "@/lib/equipment-dates";
import { trackerStatus, formatEquipmentDay } from "@/lib/equipment-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ResourceOption {
  id: string;
  name: string;
  capacity: number | null;
  siteId: string;
  nextCalibrationDueOn?: Date | string | null;
  calibrationIntervalDays?: number | null;
  site: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    maxBookingMinutes: number;
    iconKey: string;
  };
}

interface BookingCreateFormProps {
  resources: ResourceOption[];
  prefilled: {
    resourceId?: string;
    date?: string;
    start?: string;
    end?: string;
  };
}

export function BookingCreateForm({ resources, prefilled }: BookingCreateFormProps) {
  const [state, formAction, isPending] = useActionState(createBookingAction, undefined);

  const [selectedResourceId, setSelectedResourceId] = React.useState(
    prefilled.resourceId ?? (resources[0]?.id || ""),
  );
  const [startDate, setStartDate] = React.useState(prefilled.date ?? "");
  const [startTime, setStartTime] = React.useState(prefilled.start ?? "");
  const [endDate, setEndDate] = React.useState(prefilled.date ?? "");
  const [endTime, setEndTime] = React.useState(prefilled.end ?? "");

  const selectedResource = React.useMemo(
    () => resources.find((r) => r.id === selectedResourceId),
    [resources, selectedResourceId],
  );

  // Is this form prefilled with a locked resource and timeslot from Find a Slot?
  const isPrefilledSlot = Boolean(
    prefilled.resourceId && prefilled.date && prefilled.start && prefilled.end,
  );

  // Group active resources by site
  const groupedBySite = React.useMemo(() => {
    const map = new Map<string, { siteName: string; items: ResourceOption[] }>();
    for (const res of resources) {
      const siteGroup = map.get(res.site.id) ?? { siteName: res.site.name, items: [] };
      siteGroup.items.push(res);
      map.set(res.site.id, siteGroup);
    }
    return Array.from(map.entries());
  }, [resources]);

  // When start date changes, default end date to match if it was matching previously or empty
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    if (!endDate || endDate === startDate) {
      setEndDate(newStart);
    }
    setStartDate(newStart);
  };

  // Focus first error field if state returns fieldErrors
  React.useEffect(() => {
    if (state?.fieldErrors) {
      const firstKey = Object.keys(state.fieldErrors)[0];
      if (firstKey) {
        const elem = document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
        if (elem) {
          elem.focus();
        }
      }
    }
  }, [state]);

  const stepSeconds = SLOT_MINUTES * 60; // 900 seconds = 15 minutes

  const calendarLink = selectedResource
    ? `/calendar?date=${startDate || prefilled.date || ""}&site=${selectedResource.siteId}`
    : `/calendar`;

  const calibrationDueSoonText = React.useMemo(() => {
    if (!selectedResource?.nextCalibrationDueOn) return null;
    const dueDay =
      typeof selectedResource.nextCalibrationDueOn === "string"
        ? selectedResource.nextCalibrationDueOn.slice(0, 10)
        : dbToDay(selectedResource.nextCalibrationDueOn);
    const today = format(new Date(), "yyyy-MM-dd");
    const status = trackerStatus({
      dueOn: dueDay,
      today,
      dueSoonDays: CALIBRATION_DUE_SOON_DAYS,
    });
    if (status === "DUE_SOON" || status === "DUE_TODAY") {
      return `Calibrated until ${formatEquipmentDay(dueDay)}`;
    }
    return null;
  }, [selectedResource]);

  // Calculated duration in minutes to handle suggestion clicks cleanly
  const durationMinutes = React.useMemo(() => {
    if (!startTime || !endTime) return 60;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) endMin += 24 * 60;
    return Math.max(15, endMin - startMin);
  }, [startTime, endTime]);

  // Read-only summary line matching format:
  // "PCR machine 2 · Main Laboratory, Colombo · Tue 20 Oct, 10:00 to 11:00"
  const formattedSummary = React.useMemo(() => {
    if (!selectedResource || !startDate || !startTime || !endTime) return "";
    try {
      const d = new Date(`${startDate}T12:00:00Z`);
      const dayStr = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(d);
      return `${selectedResource.name} · ${selectedResource.site.name} · ${dayStr}, ${startTime} to ${endTime}`;
    } catch {
      return `${selectedResource.name} · ${selectedResource.site.name} · ${startDate}, ${startTime} to ${endTime}`;
    }
  }, [selectedResource, startDate, startTime, endTime]);

  const changeHref = React.useMemo(() => {
    const params = new URLSearchParams();
    if (startDate) params.set("date", startDate);
    if (startTime) params.set("start", startTime);
    if (durationMinutes) params.set("duration", String(durationMinutes));
    if (selectedResource?.siteId) params.set("siteId", selectedResource.siteId);
    if (selectedResource?.category?.id) params.set("categoryId", selectedResource.category.id);
    return `/book?${params.toString()}`;
  }, [startDate, startTime, durationMinutes, selectedResource]);

  const handleSelectSuggestion = (newStartTime: string) => {
    const [sh, sm] = newStartTime.split(":").map(Number);
    const totalEndMin = sh * 60 + sm + durationMinutes;
    const eh = Math.floor(totalEndMin / 60) % 24;
    const em = totalEndMin % 60;
    const newEndTime = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;

    setStartTime(newStartTime);
    setEndTime(newEndTime);
  };

  return (
    <Card className="w-full max-w-[640px] mx-auto bg-[#141c2b] border-[#334155] shadow-lg">
      <CardHeader className="border-b border-[#334155] pb-4">
        <div className="flex items-center gap-2 text-xs font-mono text-[#6cd8cb] uppercase tracking-wider">
          <Calendar className="size-4" />
          <span>New Reservation</span>
        </div>
        <CardTitle className="text-xl font-bold text-white tracking-tight">
          Book a resource
        </CardTitle>
        <CardDescription className="text-xs text-[#94a3b8]">
          Reserve a shared instrument, biosafety cabinet, or room across the clinical network.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <form action={formAction} className="space-y-5">
          {/* Clash or Global Error Alert */}
          {state?.error && (
            <div
              role="alert"
              className="p-3.5 rounded-lg border border-rose-500/50 bg-rose-950/30 text-rose-200 text-xs font-mono space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-sans">{state.error}</div>
              </div>

              {/* Suggestions on lost race / clash */}
              {state.suggestions && state.suggestions.length > 0 && (
                <div className="pt-2 border-t border-rose-500/20">
                  <p className="text-[11px] text-slate-300 font-sans mb-1.5 font-medium">
                    Nearest free start times today:
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {state.suggestions.map((timeStr) => (
                      <button
                        type="button"
                        key={timeStr}
                        onClick={() => handleSelectSuggestion(timeStr)}
                        className="px-2.5 py-1 rounded bg-[#18202f] border border-[#334155] hover:border-[#6cd8cb] text-[#6cd8cb] hover:text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                      >
                        {timeStr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1 border-t border-rose-500/20 flex justify-end">
                <Link
                  href={calendarLink}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6cd8cb] hover:text-white transition-colors"
                >
                  <span>See this day in the calendar</span>
                  <ArrowRight className="size-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Hidden inputs to pass selected resource and times */}
          <input type="hidden" name="resourceId" value={selectedResourceId} />

          {/* Read-only summary when coming prefilled from Find a Slot */}
          {isPrefilledSlot && selectedResource ? (
            <div className="p-3.5 rounded-lg border border-[#334155] bg-[#0d1522] space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon
                    iconKey={selectedResource.category.iconKey}
                    className="size-5 shrink-0 text-[#6cd8cb]"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{selectedResource.name}</p>
                    <p className="text-xs text-[#94a3b8] truncate">{selectedResource.site.name}</p>
                  </div>
                </div>
                <Link
                  href={changeHref}
                  className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#6cd8cb] hover:text-white hover:underline shrink-0"
                >
                  <ArrowLeft className="size-3" />
                  <span>Change</span>
                </Link>
              </div>

              <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-between text-xs font-mono">
                <span className="text-[#94a3b8]">Reserved Slot:</span>
                <span className="font-bold text-[#6cd8cb] tabular-nums">
                  {formattedSummary.split(" · ")[2] || `${startDate}, ${startTime} to ${endTime}`}
                </span>
              </div>

              {calibrationDueSoonText && (
                <div className="pt-2 border-t border-[#334155]/60 flex items-center gap-1.5 text-xs font-mono text-amber-400 font-semibold">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{calibrationDueSoonText}</span>
                </div>
              )}

              {/* Hidden inputs for date and time fields */}
              <input type="hidden" name="startDate" value={startDate} />
              <input type="hidden" name="startTime" value={startTime} />
              <input type="hidden" name="endDate" value={endDate} />
              <input type="hidden" name="endTime" value={endTime} />
            </div>
          ) : (
            <>
              {/* Resource Select */}
              <div className="space-y-1.5">
                <Label htmlFor="resourceSelect" className="text-xs font-mono text-[#dbe2f8]">
                  Resource <span className="text-[#6cd8cb]">*</span>
                </Label>
                <Select
                  value={selectedResourceId}
                  onValueChange={(val) => val && setSelectedResourceId(val)}
                >
                  <SelectTrigger
                    id="resourceSelect"
                    className="w-full h-10 bg-[#060e1d] border-[#334155] text-slate-100 text-xs font-mono focus-visible:border-[#6cd8cb]"
                  >
                    <SelectValue placeholder="Select a resource..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141c2b] border-[#334155] text-slate-100 max-h-80">
                    {groupedBySite.map(([siteId, group]) => (
                      <SelectGroup key={siteId}>
                        <SelectLabel className="text-[11px] font-mono uppercase text-[#6cd8cb] tracking-wider px-2 py-1.5 bg-[#18202f]">
                          {group.siteName}
                        </SelectLabel>
                        {group.items.map((res) => (
                          <SelectItem
                            key={res.id}
                            value={res.id}
                            className="text-xs font-mono py-2 hover:bg-[#222a3a] cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <CategoryIcon
                                iconKey={res.category.iconKey}
                                className="size-4 shrink-0 text-[#6cd8cb]"
                              />
                              <span className="font-medium text-white">{res.name}</span>
                              <span className="text-[#94a3b8] text-[11px]">
                                ({formatMinutes(res.category.maxBookingMinutes)} max)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                {/* Dynamic Resource Hint */}
                {selectedResource && (
                  <div className="text-[11px] font-mono text-[#94a3b8] pt-1 pl-0.5 space-y-0.5">
                    <p>
                      <span className="text-[#6cd8cb] font-semibold">
                        {selectedResource.category.name}
                      </span>{" "}
                      can be booked for up to{" "}
                      <span className="text-white font-semibold">
                        {formatMinutes(selectedResource.category.maxBookingMinutes)}
                      </span>
                      .
                    </p>
                    {selectedResource.capacity ? (
                      <p className="text-emerald-400">
                        Holds up to {selectedResource.capacity} people.
                      </p>
                    ) : null}
                    {calibrationDueSoonText && (
                      <p className="text-amber-400 font-semibold flex items-center gap-1.5 pt-0.5">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>{calibrationDueSoonText}</span>
                      </p>
                    )}
                  </div>
                )}
                {state?.fieldErrors?.resourceId && (
                  <p className="text-[11px] font-mono text-rose-400">
                    {state.fieldErrors.resourceId[0]}
                  </p>
                )}
              </div>

              {/* Start Date and Time (Row 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-mono text-[#dbe2f8]">
                    Start Date <span className="text-[#6cd8cb]">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="h-10 bg-[#060e1d] border-[#334155] text-white text-xs font-mono tabular-nums focus-visible:border-[#6cd8cb]"
                  />
                  {state?.fieldErrors?.startDate && (
                    <p className="text-[11px] font-mono text-rose-400">
                      {state.fieldErrors.startDate[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-xs font-mono text-[#dbe2f8]">
                    Start Time <span className="text-[#6cd8cb]">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    step={stepSeconds}
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-10 bg-[#060e1d] border-[#334155] text-white text-xs font-mono tabular-nums focus-visible:border-[#6cd8cb]"
                  />
                  {state?.fieldErrors?.startTime && (
                    <p className="text-[11px] font-mono text-rose-400">
                      {state.fieldErrors.startTime[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* End Date and Time (Row 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs font-mono text-[#dbe2f8]">
                    End Date <span className="text-[#6cd8cb]">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 bg-[#060e1d] border-[#334155] text-white text-xs font-mono tabular-nums focus-visible:border-[#6cd8cb]"
                  />
                  {state?.fieldErrors?.endDate && (
                    <p className="text-[11px] font-mono text-rose-400">
                      {state.fieldErrors.endDate[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-xs font-mono text-[#dbe2f8]">
                    End Time <span className="text-[#6cd8cb]">*</span>
                  </Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="time"
                    step={stepSeconds}
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10 bg-[#060e1d] border-[#334155] text-white text-xs font-mono tabular-nums focus-visible:border-[#6cd8cb]"
                  />
                  {state?.fieldErrors?.endTime && (
                    <p className="text-[11px] font-mono text-rose-400">
                      {state.fieldErrors.endTime[0]}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label htmlFor="purpose" className="text-xs font-mono text-[#dbe2f8]">
              Purpose <span className="text-[#6cd8cb]">*</span>
            </Label>
            <Input
              id="purpose"
              name="purpose"
              type="text"
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g. HbA1c batch"
              className="h-10 bg-[#060e1d] border-[#334155] text-white text-xs font-mono focus-visible:border-[#6cd8cb]"
            />
            <p className="text-[10px] font-mono text-[#94a3b8]">
              3 to 200 characters describing the diagnostic or research work.
            </p>
            {state?.fieldErrors?.purpose && (
              <p className="text-[11px] font-mono text-rose-400">{state.fieldErrors.purpose[0]}</p>
            )}
          </div>

          {/* Attendees (Only shown when chosen resource has capacity) */}
          {selectedResource?.capacity ? (
            <div className="space-y-1.5 p-3 rounded-lg border border-[#334155] bg-[#060e1d]/60">
              <Label htmlFor="attendeeCount" className="text-xs font-mono text-[#dbe2f8]">
                Expected Attendees <span className="text-[#6cd8cb]">*</span>
              </Label>
              <Input
                id="attendeeCount"
                name="attendeeCount"
                type="number"
                min={1}
                max={selectedResource.capacity}
                required
                placeholder={`1 to ${selectedResource.capacity}`}
                className="h-10 bg-[#060e1d] border-[#334155] text-white text-xs font-mono tabular-nums focus-visible:border-[#6cd8cb]"
              />
              <p className="text-[10px] font-mono text-[#94a3b8]">
                This room holds a maximum of {selectedResource.capacity} persons.
              </p>
              {state?.fieldErrors?.attendeeCount && (
                <p className="text-[11px] font-mono text-rose-400">
                  {state.fieldErrors.attendeeCount[0]}
                </p>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#334155]">
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-mono bg-[#18202f] hover:bg-[#222a3a] text-[#94a3b8] hover:text-white border-[#334155]"
            >
              <Link href={isPrefilledSlot ? changeHref : "/bookings"}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 px-5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  <span>Booking...</span>
                </>
              ) : (
                <span>Book</span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
