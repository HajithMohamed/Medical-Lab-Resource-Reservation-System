"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wrench, AlertTriangle, AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createMaintenanceBlockAction, type ActionState } from "@/actions/maintenance";
import type { MaintenanceResourceItem } from "@/services/maintenance";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";

export interface MaintenanceFormProps {
  resources: MaintenanceResourceItem[];
  defaultResourceId?: string;
  defaultStartDate: string;
  defaultStartTime: string;
  defaultEndDate: string;
  defaultEndTime: string;
  defaultReason?: string;
  isBreakdown: boolean;
  isAdmin: boolean;
  returnTo?: string;
}

export function MaintenanceForm({
  resources,
  defaultResourceId = "",
  defaultStartDate,
  defaultStartTime,
  defaultEndDate,
  defaultEndTime,
  defaultReason = "",
  isBreakdown,
  isAdmin,
  returnTo,
}: MaintenanceFormProps) {
  const router = useRouter();
  const effectiveReturnTo = returnTo || "/equipment?tab=blocked";

  const [resourceId, setResourceId] = React.useState<string>(defaultResourceId);
  const [startDate, setStartDate] = React.useState<string>(defaultStartDate);
  const [startTime, setStartTime] = React.useState<string>(defaultStartTime);
  const [endDate, setEndDate] = React.useState<string>(defaultEndDate);
  const [endTime, setEndTime] = React.useState<string>(defaultEndTime);
  const [reason, setReason] = React.useState<string>(
    isBreakdown ? "Breakdown: " : defaultReason || "",
  );
  const [cancelConfirmed, setCancelConfirmed] = React.useState<boolean>(false);

  const [state, formAction, isPending] = React.useActionState<ActionState, FormData>(
    async (prevState, formData) => {
      const res = await createMaintenanceBlockAction(prevState, formData);
      if (res.ok) {
        toast.success("Time blocked successfully");
        window.location.assign(effectiveReturnTo);
      }
      return res;
    },
    { ok: false },
  );

  // Group resources by site if admin
  const resourcesBySite = React.useMemo(() => {
    if (!isAdmin) return null;
    const map = new Map<string, MaintenanceResourceItem[]>();
    for (const r of resources) {
      const list = map.get(r.siteName) ?? [];
      list.push(r);
      map.set(r.siteName, list);
    }
    return map;
  }, [resources, isAdmin]);

  const hasClashes = Boolean(state.needsConfirmation && state.clashes && state.clashes.length > 0);
  const clashesCount = state.clashes?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 sm:pb-8">
      <div>
        <Link
          href={effectiveReturnTo}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Equipment</span>
        </Link>
      </div>

      <div className="rounded-[20px] bg-card border border-card-edge p-6 sm:p-8 shadow-v4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-line">
          <div
            className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
              isBreakdown ? "bg-red-soft text-red" : "bg-amber-soft text-amber"
            }`}
          >
            {isBreakdown ? <ShieldAlert className="size-5" /> : <Wrench className="size-5" />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy">
              {isBreakdown ? "Report a breakdown" : "Block time for maintenance"}
            </h1>
            <p className="text-xs text-muted">
              {isBreakdown
                ? "Block the resource immediately for unscheduled repairs."
                : "Reserve time for scheduled maintenance, calibration, or servicing."}
            </p>
          </div>
        </div>

        {/* Breakdown Alert */}
        {isBreakdown && (
          <div
            role="alert"
            className="p-4 rounded-2xl border border-amber/30 bg-amber-soft text-amber text-xs space-y-1.5"
          >
            <div className="flex items-center gap-2 font-bold text-amber">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Immediate Breakdown Block</span>
            </div>
            <p className="leading-relaxed">
              The block starts now. If you do not know when repairs will be finished, set the
              resource to{" "}
              <Link
                href={resourceId ? `/resources/${resourceId}` : "/resources"}
                className="font-bold underline hover:opacity-80"
              >
                Out of service
              </Link>{" "}
              instead.
            </p>
          </div>
        )}

        {/* Top Error */}
        {state.error && !hasClashes && (
          <div
            role="alert"
            className="p-4 rounded-2xl border border-red/30 bg-red-soft text-red text-xs flex items-center gap-2"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span className="font-semibold">{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-6">
          <input
            type="hidden"
            name="cancelClashingBookings"
            value={cancelConfirmed ? "true" : "false"}
          />

          {/* Resource Select */}
          <div className="space-y-1.5">
            <Label
              htmlFor="resourceId"
              className="text-xs font-bold text-navy flex items-center gap-1"
            >
              <span>Resource</span>
              <span className="text-red">*</span>
            </Label>
            <select
              id="resourceId"
              name="resourceId"
              required
              value={resourceId}
              onChange={(e) => {
                setResourceId(e.target.value);
                setCancelConfirmed(false);
              }}
              className="w-full h-11 rounded-xl bg-canvas border border-card-edge px-3 text-sm font-semibold text-navy focus:border-teal outline-none cursor-pointer"
            >
              <option value="" disabled>
                Select a resource...
              </option>
              {isAdmin && resourcesBySite
                ? Array.from(resourcesBySite.entries()).map(([siteName, siteResources]) => (
                    <optgroup key={siteName} label={siteName} className="bg-card text-navy">
                      {siteResources.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.categoryName})
                        </option>
                      ))}
                    </optgroup>
                  ))
                : resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.categoryName})
                    </option>
                  ))}
            </select>
            {state.fieldErrors?.resourceId && (
              <p className="text-xs font-semibold text-red">{state.fieldErrors.resourceId[0]}</p>
            )}
          </div>

          {/* Time window inputs: Start & End */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Window */}
            <div className="space-y-3 p-4 rounded-2xl border border-card-edge bg-canvas">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted block">
                Start Window
              </span>
              <div className="space-y-1">
                <Label htmlFor="startDate" className="text-xs font-bold text-navy">
                  Date
                </Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCancelConfirmed(false);
                  }}
                  className="h-10 rounded-xl bg-card border-card-edge text-sm text-navy"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="startTime" className="text-xs font-bold text-navy">
                  Time (15-min intervals)
                </Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  step="900"
                  required
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setCancelConfirmed(false);
                  }}
                  className="h-10 rounded-xl bg-card border-card-edge text-sm text-navy"
                />
              </div>
            </div>

            {/* End Window */}
            <div className="space-y-3 p-4 rounded-2xl border border-card-edge bg-canvas">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted block">
                End Window
              </span>
              <div className="space-y-1">
                <Label htmlFor="endDate" className="text-xs font-bold text-navy">
                  Date
                </Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCancelConfirmed(false);
                  }}
                  className="h-10 rounded-xl bg-card border-card-edge text-sm text-navy"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endTime" className="text-xs font-bold text-navy">
                  Time (15-min intervals)
                </Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  step="900"
                  required
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setCancelConfirmed(false);
                  }}
                  className="h-10 rounded-xl bg-card border-card-edge text-sm text-navy"
                />
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="reason" className="text-xs font-bold text-navy flex items-center gap-1">
              <span>Reason for maintenance</span>
              <span className="text-red">*</span>
            </Label>
            <Textarea
              id="reason"
              name="reason"
              required
              minLength={3}
              maxLength={200}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual optical sensor calibration and alignment"
              className="rounded-xl bg-canvas border-card-edge text-sm text-navy placeholder:text-faint resize-none focus:border-teal"
            />
            <p className="text-[11px] text-muted">
              Between 3 and 200 characters. If bookings clash, this reason will be recorded on each
              affected booking slip.
            </p>
            {state.fieldErrors?.reason && (
              <p className="text-xs font-semibold text-red">{state.fieldErrors.reason[0]}</p>
            )}
          </div>

          {/* Clashes Confirmation Panel */}
          {hasClashes && (
            <div className="p-4 rounded-2xl border border-amber/30 bg-amber-soft text-amber space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                <span>These {clashesCount} booking(s) will be cancelled</span>
              </div>
              <div className="divide-y divide-amber/20 border-y border-amber/20 max-h-48 overflow-y-auto">
                {state.clashes?.map((clash) => (
                  <div
                    key={clash.id}
                    className="py-2 flex items-start justify-between text-xs gap-3"
                  >
                    <div>
                      <span className="font-bold text-navy block">{clash.createdBy.name}</span>
                      <span className="text-muted italic">{clash.purpose}</span>
                    </div>
                    <span className="font-bold text-amber tabular-nums shrink-0">
                      {clash.timeRange}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="confirmClashes"
                  checked={cancelConfirmed}
                  onCheckedChange={(checked) => setCancelConfirmed(Boolean(checked))}
                />
                <Label
                  htmlFor="confirmClashes"
                  className="text-xs font-bold text-navy cursor-pointer"
                >
                  Cancel these bookings and record the reason
                </Label>
              </div>
            </div>
          )}

          {/* Desktop Form Actions */}
          <div className="hidden sm:flex items-center justify-end gap-3 pt-4 border-t border-line">
            <Button
              asChild
              type="button"
              variant="outline"
              className="h-11 px-6 rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
            >
              <Link href={effectiveReturnTo}>Cancel</Link>
            </Button>

            {hasClashes ? (
              <Button
                type="submit"
                variant="destructive"
                disabled={!cancelConfirmed || isPending}
                className="h-11 px-6 rounded-xl bg-red hover:bg-red/90 text-white font-bold text-xs"
              >
                {isPending
                  ? "Blocking..."
                  : `Block time and cancel ${clashesCount} ${clashesCount === 1 ? "booking" : "bookings"}`}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending}
                className="h-11 px-6 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95"
              >
                {isPending ? "Blocking..." : "Block time"}
              </Button>
            )}
          </div>

          {/* Mobile Sticky Action Bar */}
          <StickyActionBar className="sm:hidden">
            <Button
              asChild
              type="button"
              variant="outline"
              className="w-28 h-11 rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
            >
              <Link href={effectiveReturnTo}>Cancel</Link>
            </Button>
            {hasClashes ? (
              <Button
                type="submit"
                variant="destructive"
                disabled={!cancelConfirmed || isPending}
                className="flex-1 h-11 rounded-xl bg-red hover:bg-red/90 text-white font-bold text-xs"
              >
                {isPending ? "Blocking..." : "Confirm & block"}
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1 h-11 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95"
              >
                {isPending ? "Blocking..." : "Block time"}
              </Button>
            )}
          </StickyActionBar>
        </form>
      </div>
    </div>
  );
}
