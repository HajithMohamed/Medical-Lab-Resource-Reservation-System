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
    <Card className="w-full max-w-[640px] mx-auto bg-card border border-card-edge shadow-v4 rounded-3xl">
      <CardHeader className="border-b border-card-edge bg-canvas/60 px-6 py-5 rounded-t-3xl">
        <div className="flex items-center gap-2 text-[11px] font-extrabold text-teal uppercase tracking-wider mb-0.5">
          <Calendar className="size-4" />
          <span>New Reservation</span>
        </div>
        <CardTitle className="text-xl font-bold text-navy tracking-tight">
          Book a resource
        </CardTitle>
        <CardDescription className="text-xs text-muted font-normal">
          Reserve a shared instrument, biosafety cabinet, or room across the clinical network.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form action={formAction} className="space-y-5">
          {/* Clash or Global Error Alert */}
          {state?.error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl border border-red/30 bg-red-soft text-red text-xs space-y-2.5 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 text-red shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-semibold">{state.error}</div>
              </div>

              {/* Suggestions on lost race / clash */}
              {state.suggestions && state.suggestions.length > 0 && (
                <div className="pt-2 border-t border-red/20">
                  <p className="text-[11px] text-muted font-bold mb-1.5">
                    Nearest free start times today:
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {state.suggestions.map((timeStr) => (
                      <button
                        type="button"
                        key={timeStr}
                        onClick={() => handleSelectSuggestion(timeStr)}
                        className="px-2.5 py-1 rounded-xl bg-mint border border-teal-line hover:bg-teal hover:text-white text-teal-deep text-xs font-bold transition-all cursor-pointer"
                      >
                        {timeStr}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-1.5 border-t border-red/20 flex justify-end">
                <Link
                  href={calendarLink}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline transition-colors"
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
            <div className="p-4 rounded-2xl border border-card-edge bg-canvas/70 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CategoryIcon
                    iconKey={selectedResource.category.iconKey}
                    className="size-6 shrink-0 text-teal"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-navy text-sm truncate">{selectedResource.name}</p>
                    <p className="text-xs text-muted truncate">{selectedResource.site.name}</p>
                  </div>
                </div>
                <Link
                  href={changeHref}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:underline shrink-0"
                >
                  <ArrowLeft className="size-3" />
                  <span>Change</span>
                </Link>
              </div>

              <div className="pt-2 border-t border-card-edge flex items-center justify-between text-xs">
                <span className="text-muted font-medium">Reserved Slot:</span>
                <span className="font-bold text-teal-deep tabular-nums">
                  {formattedSummary.split(" · ")[2] || `${startDate}, ${startTime} to ${endTime}`}
                </span>
              </div>

              {calibrationDueSoonText && (
                <div className="pt-2 border-t border-card-edge flex items-center gap-1.5 text-xs text-amber font-bold">
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
                <Label htmlFor="resourceSelect" className="text-xs font-bold text-navy">
                  Resource <span className="text-teal">*</span>
                </Label>
                <Select
                  value={selectedResourceId}
                  onValueChange={(val) => val && setSelectedResourceId(val)}
                >
                  <SelectTrigger
                    id="resourceSelect"
                    className="w-full h-10 bg-card border-card-edge text-navy text-xs font-semibold focus-visible:border-teal rounded-xl shadow-2xs"
                  >
                    <SelectValue placeholder="Select a resource..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-card-edge text-ink max-h-80 rounded-2xl shadow-v4">
                    {groupedBySite.map(([siteId, group]) => (
                      <SelectGroup key={siteId}>
                        <SelectLabel className="text-[10.5px] font-extrabold uppercase text-muted tracking-wider px-2.5 py-1.5 bg-canvas">
                          {group.siteName}
                        </SelectLabel>
                        {group.items.map((res) => (
                          <SelectItem
                            key={res.id}
                            value={res.id}
                            className="text-xs font-semibold py-2 hover:bg-mint cursor-pointer rounded-xl"
                          >
                            <div className="flex items-center gap-2">
                              <CategoryIcon
                                iconKey={res.category.iconKey}
                                className="size-4 shrink-0 text-teal"
                              />
                              <span className="font-bold text-navy">{res.name}</span>
                              <span className="text-muted text-[11px] font-normal">
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
                  <div className="text-xs text-muted pt-1 pl-0.5 space-y-0.5 font-normal">
                    <p>
                      <span className="text-teal-deep font-bold">
                        {selectedResource.category.name}
                      </span>{" "}
                      can be booked for up to{" "}
                      <span className="text-navy font-bold">
                        {formatMinutes(selectedResource.category.maxBookingMinutes)}
                      </span>
                      .
                    </p>
                    {selectedResource.capacity ? (
                      <p className="text-teal font-semibold">
                        Holds up to {selectedResource.capacity} people.
                      </p>
                    ) : null}
                    {calibrationDueSoonText && (
                      <p className="text-amber font-bold flex items-center gap-1.5 pt-0.5">
                        <AlertCircle className="size-3.5 shrink-0" />
                        <span>{calibrationDueSoonText}</span>
                      </p>
                    )}
                  </div>
                )}
                {state?.fieldErrors?.resourceId && (
                  <p className="text-[11px] font-semibold text-red">
                    {state.fieldErrors.resourceId[0]}
                  </p>
                )}
              </div>

              {/* Start Date and Time (Row 1) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-bold text-navy">
                    Start Date <span className="text-teal">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={handleStartDateChange}
                    className="h-10 bg-card border-card-edge text-navy text-xs font-semibold tabular-nums focus-visible:border-teal rounded-xl shadow-2xs"
                  />
                  {state?.fieldErrors?.startDate && (
                    <p className="text-[11px] font-semibold text-red">
                      {state.fieldErrors.startDate[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-xs font-bold text-navy">
                    Start Time <span className="text-teal">*</span>
                  </Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    step={stepSeconds}
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-10 bg-card border-card-edge text-navy text-xs font-semibold tabular-nums focus-visible:border-teal rounded-xl shadow-2xs"
                  />
                  {state?.fieldErrors?.startTime && (
                    <p className="text-[11px] font-semibold text-red">
                      {state.fieldErrors.startTime[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* End Date and Time (Row 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-xs font-bold text-navy">
                    End Date <span className="text-teal">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 bg-card border-card-edge text-navy text-xs font-semibold tabular-nums focus-visible:border-teal rounded-xl shadow-2xs"
                  />
                  {state?.fieldErrors?.endDate && (
                    <p className="text-[11px] font-semibold text-red">
                      {state.fieldErrors.endDate[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-xs font-bold text-navy">
                    End Time <span className="text-teal">*</span>
                  </Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="time"
                    step={stepSeconds}
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10 bg-card border-card-edge text-navy text-xs font-semibold tabular-nums focus-visible:border-teal rounded-xl shadow-2xs"
                  />
                  {state?.fieldErrors?.endTime && (
                    <p className="text-[11px] font-semibold text-red">
                      {state.fieldErrors.endTime[0]}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label htmlFor="purpose" className="text-xs font-bold text-navy">
              Purpose <span className="text-teal">*</span>
            </Label>
            <Input
              id="purpose"
              name="purpose"
              type="text"
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g. HbA1c batch"
              className="h-10 bg-card border-card-edge text-navy text-xs font-semibold focus-visible:border-teal rounded-xl shadow-2xs"
            />
            <p className="text-[11px] text-muted font-normal">
              3 to 200 characters describing the diagnostic or research work.
            </p>
            {state?.fieldErrors?.purpose && (
              <p className="text-[11px] font-semibold text-red">{state.fieldErrors.purpose[0]}</p>
            )}
          </div>

          {/* Attendees (Only shown when chosen resource has capacity) */}
          {selectedResource?.capacity ? (
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-card-edge bg-canvas/60">
              <Label htmlFor="attendeeCount" className="text-xs font-bold text-navy">
                Expected Attendees <span className="text-teal">*</span>
              </Label>
              <Input
                id="attendeeCount"
                name="attendeeCount"
                type="number"
                min={1}
                max={selectedResource.capacity}
                required
                placeholder={`1 to ${selectedResource.capacity}`}
                className="h-10 bg-card border-card-edge text-navy text-xs font-semibold tabular-nums focus-visible:border-teal rounded-xl shadow-2xs"
              />
              <p className="text-[11px] text-muted font-normal">
                This room holds a maximum of {selectedResource.capacity} persons.
              </p>
              {state?.fieldErrors?.attendeeCount && (
                <p className="text-[11px] font-semibold text-red">
                  {state.fieldErrors.attendeeCount[0]}
                </p>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-card-edge">
            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-card hover:bg-mint text-navy border border-card-edge rounded-xl shadow-2xs"
            >
              <Link href={isPrefilledSlot ? changeHref : "/bookings"}>Cancel</Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 px-5 bg-teal hover:bg-teal-deep text-white font-bold text-xs rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
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
