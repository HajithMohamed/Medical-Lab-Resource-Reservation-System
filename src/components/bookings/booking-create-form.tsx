"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { createBookingAction } from "@/actions/bookings";
import { CategoryIcon } from "@/components/category-icon";
import { formatMinutes } from "@/lib/format";
import { SLOT_MINUTES } from "@/config/rules";
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
              className="p-3.5 rounded-lg border border-rose-500/50 bg-rose-950/30 text-rose-200 text-xs font-mono space-y-2 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{state.error}</div>
              </div>
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

          {/* Hidden input to pass selected resource id */}
          <input type="hidden" name="resourceId" value={selectedResourceId} />

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
              <Link href="/bookings">Cancel</Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-9 px-5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-sm active:scale-95 transition-all"
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
