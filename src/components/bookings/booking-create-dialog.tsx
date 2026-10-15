"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Calendar, ArrowRight, Loader2, Maximize2, AlertCircle } from "lucide-react";
import { useActionState } from "react";
import { format } from "date-fns";
import { createBookingAction } from "@/actions/bookings";
import { CategoryIcon } from "@/components/category-icon";
import { formatMinutes } from "@/lib/format";
import { SLOT_MINUTES, CALIBRATION_DUE_SOON_DAYS } from "@/config/rules";
import { dbToDay } from "@/lib/equipment-dates";
import { trackerStatus, formatEquipmentDay } from "@/lib/equipment-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResourceOption } from "@/components/bookings/booking-create-form";

interface BookingCreateDialogProps {
  resources: ResourceOption[];
  prefilled?: {
    resourceId?: string;
    date?: string;
    start?: string;
    end?: string;
  };
  trigger?: React.ReactNode;
}

export function BookingCreateDialog({
  resources,
  prefilled = {},
  trigger,
}: BookingCreateDialogProps) {
  const [open, setOpen] = React.useState(false);
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

  const groupedBySite = React.useMemo(() => {
    const map = new Map<string, { siteName: string; items: ResourceOption[] }>();
    for (const res of resources) {
      const siteGroup = map.get(res.site.id) ?? { siteName: res.site.name, items: [] };
      siteGroup.items.push(res);
      map.set(res.site.id, siteGroup);
    }
    return Array.from(map.entries());
  }, [resources]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    if (!endDate || endDate === startDate) {
      setEndDate(newStart);
    }
    setStartDate(newStart);
  };

  // Handle successful booking redirection and dialog close
  React.useEffect(() => {
    if (state?.ok && state?.reservationId) {
      setOpen(false);
      window.location.assign(`/bookings?notice=booked&highlight=${state.reservationId}`);
    }
  }, [state]);

  const stepSeconds = SLOT_MINUTES * 60; // 900 seconds = 15 minutes

  const calendarLink = selectedResource
    ? `/calendar?date=${startDate || prefilled.date || ""}&site=${selectedResource.siteId}`
    : `/calendar`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-teal hover:bg-teal-deep text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>Book a resource</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-card border border-card-edge rounded-3xl shadow-v4">
        <DialogHeader className="px-6 py-4 border-b border-card-edge bg-canvas/60 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-extrabold text-teal uppercase tracking-wider mb-0.5">
              <Calendar className="size-3.5" />
              <span>Clinical Reservation</span>
            </div>
            <DialogTitle className="text-base font-bold text-navy tracking-tight">
              Book a resource
            </DialogTitle>
            <DialogDescription className="text-xs text-muted font-normal">
              Reserve a shared instrument, biosafety cabinet, or room across the clinical network.
            </DialogDescription>
          </div>
          <Link
            href={`/bookings/new${selectedResourceId ? `?resourceId=${selectedResourceId}` : ""}`}
            className="text-xs font-semibold text-muted hover:text-teal flex items-center gap-1 transition-colors mr-6"
            title="Open full page view"
          >
            <Maximize2 className="size-3" />
            <span className="hidden sm:inline">Full page</span>
          </Link>
        </DialogHeader>

        <form action={formAction} className="p-6 space-y-4">
          {/* Clash or Global Error Alert */}
          {state?.error && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl border border-red/30 bg-red-soft text-red text-xs space-y-2 animate-in fade-in"
            >
              <div className="flex items-start gap-2.5">
                <div className="flex-1 leading-relaxed font-semibold">{state.error}</div>
              </div>
              <div className="pt-1.5 border-t border-red/20 flex justify-end">
                <Link
                  href={calendarLink}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline transition-colors"
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
            <Label
              htmlFor="modalResourceSelect"
              className="text-xs font-bold text-navy"
            >
              Resource <span className="text-teal">*</span>
            </Label>
            <Select
              value={selectedResourceId}
              onValueChange={(val) => val && setSelectedResourceId(val)}
            >
              <SelectTrigger
                id="modalResourceSelect"
                className="w-full h-10 bg-card border-card-edge text-navy text-xs font-semibold focus-visible:border-teal rounded-xl shadow-2xs"
              >
                <SelectValue placeholder="Select a resource..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-card-edge text-ink max-h-72 rounded-2xl shadow-v4">
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

          {/* Start Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="modalStartDate"
                className="text-xs font-bold text-navy"
              >
                Start Date <span className="text-teal">*</span>
              </Label>
              <Input
                id="modalStartDate"
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
              <Label
                htmlFor="modalStartTime"
                className="text-xs font-bold text-navy"
              >
                Start Time <span className="text-teal">*</span>
              </Label>
              <Input
                id="modalStartTime"
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

          {/* End Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="modalEndDate"
                className="text-xs font-bold text-navy"
              >
                End Date <span className="text-teal">*</span>
              </Label>
              <Input
                id="modalEndDate"
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
              <Label
                htmlFor="modalEndTime"
                className="text-xs font-bold text-navy"
              >
                End Time <span className="text-teal">*</span>
              </Label>
              <Input
                id="modalEndTime"
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

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label
              htmlFor="modalPurpose"
              className="text-xs font-bold text-navy"
            >
              Purpose <span className="text-teal">*</span>
            </Label>
            <Input
              id="modalPurpose"
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

          {/* Attendees */}
          {selectedResource?.capacity ? (
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-card-edge bg-canvas/60">
              <Label
                htmlFor="modalAttendeeCount"
                className="text-xs font-bold text-navy"
              >
                Expected Attendees <span className="text-teal">*</span>
              </Label>
              <Input
                id="modalAttendeeCount"
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

          {/* Telemetry Stats Callout */}
          <div className="p-3.5 bg-canvas border border-card-edge rounded-2xl flex items-center justify-between text-xs text-muted font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-teal font-bold">ℹ</span>
              <span>15-min slot boundary alignment enforced</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-mint text-teal-deep border border-teal-line font-extrabold uppercase tracking-wider">
              Clash-Free
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-card-edge">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted hover:text-navy hover:bg-mint border border-card-edge bg-card shadow-2xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || Boolean(state?.ok)}
              className="bg-teal hover:bg-teal-deep text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              {isPending || state?.ok ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  <span>{state?.ok ? "Redirecting..." : "Booking..."}</span>
                </>
              ) : (
                <span>Book</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
