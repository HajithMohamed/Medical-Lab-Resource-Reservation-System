"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wrench, AlertTriangle, AlertCircle, ShieldAlert, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createMaintenanceBlockAction, type ActionState } from "@/actions/maintenance";
import type { MaintenanceResourceItem } from "@/services/maintenance";

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
}: MaintenanceFormProps) {
  const router = useRouter();

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
        toast.success("Time blocked");
        router.push("/equipment?tab=blocked");
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
    <div className="max-w-[640px] mx-auto space-y-4">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs font-mono text-[#879390] hover:text-white"
        >
          <Link href="/equipment?tab=blocked">
            <ArrowLeft className="size-3.5" />
            <span>Back to Maintenance & care</span>
          </Link>
        </Button>
      </div>

      <Card className="border-[#334155] bg-[#141c2b] shadow-lg">
        <CardHeader className="border-b border-[#334155] pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`size-9 rounded-lg flex items-center justify-center ${
                isBreakdown
                  ? "bg-rose-500/15 border border-rose-500/40 text-rose-400"
                  : "bg-amber-500/15 border border-amber-500/40 text-amber-400"
              }`}
            >
              {isBreakdown ? <ShieldAlert className="size-5" /> : <Wrench className="size-5" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white">
                {isBreakdown ? "Report a breakdown" : "Block time"}
              </CardTitle>
              <CardDescription className="text-xs font-mono text-[#879390]">
                {isBreakdown
                  ? "Block the resource immediately for unscheduled repairs."
                  : "Reserve time for scheduled maintenance, calibration, or servicing."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Breakdown Amber Alert */}
          {isBreakdown && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg border border-amber-500/40 bg-amber-950/20 text-amber-200 text-xs font-mono space-y-2"
            >
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                <span>Immediate Breakdown Block</span>
              </div>
              <p className="leading-relaxed">
                The block starts now. If you do not know when it will be fixed, set the resource to{" "}
                <Link
                  href={resourceId ? `/resources/${resourceId}/status` : "/resources"}
                  className="font-bold underline text-white hover:text-[#6cd8cb]"
                >
                  Out of service
                </Link>{" "}
                instead.
              </p>
            </div>
          )}

          {/* Form Top Error */}
          {state.error && !hasClashes && (
            <div
              role="alert"
              className="mb-6 p-3 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-200 text-xs font-mono flex items-center gap-2"
            >
              <AlertCircle className="size-4 shrink-0 text-rose-400" />
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            {/* Hidden parameter for confirmation */}
            <input
              type="hidden"
              name="cancelClashingBookings"
              value={cancelConfirmed ? "true" : "false"}
            />

            {/* Resource Select */}
            <div className="space-y-1.5 font-mono">
              <Label htmlFor="resourceId" className="text-xs text-slate-200">
                Resource <span className="text-rose-400">*</span>
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
                className="w-full h-9 rounded-md bg-[#060e1d] border border-[#334155] px-3 text-xs text-white focus:outline-hidden focus:ring-1 focus:ring-[#6cd8cb]"
              >
                <option value="" disabled>
                  Select a resource...
                </option>
                {isAdmin && resourcesBySite
                  ? Array.from(resourcesBySite.entries()).map(([siteName, siteResources]) => (
                      <optgroup key={siteName} label={siteName} className="bg-[#141c2b] text-white">
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
                <p className="text-[11px] text-rose-400">{state.fieldErrors.resourceId[0]}</p>
              )}
            </div>

            {/* Time window inputs: Start & End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              {/* Start Date & Time */}
              <div className="space-y-2 p-3 rounded-lg border border-[#334155] bg-[#060e1d]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#879390] block">
                  Start Window
                </span>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-[11px] text-slate-300">
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
                    className="h-8 bg-[#141c2b] border-[#334155] text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-[11px] text-slate-300">
                    Time (15-min marks)
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
                    className="h-8 bg-[#141c2b] border-[#334155] text-xs text-white"
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="space-y-2 p-3 rounded-lg border border-[#334155] bg-[#060e1d]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#879390] block">
                  End Window
                </span>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate" className="text-[11px] text-slate-300">
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
                    className="h-8 bg-[#141c2b] border-[#334155] text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-[11px] text-slate-300">
                    Time (15-min marks)
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
                    className="h-8 bg-[#141c2b] border-[#334155] text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5 font-mono">
              <Label htmlFor="reason" className="text-xs text-slate-200">
                Reason for maintenance <span className="text-rose-400">*</span>
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
                className="bg-[#060e1d] border-[#334155] text-xs text-white resize-none"
              />
              <p className="text-[11px] text-[#879390]">
                Between 3 and 200 characters. If bookings clash, this reason will be recorded on
                each affected booking slip.
              </p>
              {state.fieldErrors?.reason && (
                <p className="text-[11px] text-rose-400">{state.fieldErrors.reason[0]}</p>
              )}
            </div>

            {/* Clashes Confirmation Step Panel */}
            {hasClashes && (
              <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-950/20 text-amber-200 space-y-3 font-mono">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                  <AlertTriangle className="size-4 shrink-0 text-amber-400" />
                  <span>These {clashesCount} booking(s) will be cancelled</span>
                </div>
                <div className="divide-y divide-amber-500/20 border-y border-amber-500/20 max-h-48 overflow-y-auto">
                  {state.clashes?.map((clash) => (
                    <div
                      key={clash.id}
                      className="py-2 flex items-start justify-between text-xs gap-3"
                    >
                      <div>
                        <span className="font-semibold text-white block">
                          {clash.createdBy.name}
                        </span>
                        <span className="text-slate-300 italic">{clash.purpose}</span>
                      </div>
                      <span className="text-amber-300 font-bold tabular-nums shrink-0">
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
                  <Label htmlFor="confirmClashes" className="text-xs text-amber-100 cursor-pointer">
                    Cancel these bookings and record the reason
                  </Label>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 font-mono">
              <Button
                asChild
                type="button"
                variant="outline"
                size="sm"
                className="border-[#334155] bg-[#18202f] hover:bg-[#222a3a] text-xs text-slate-300"
              >
                <Link href="/equipment?tab=blocked">Cancel</Link>
              </Button>

              {hasClashes ? (
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={!cancelConfirmed || isPending}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs"
                >
                  {isPending
                    ? "Blocking..."
                    : `Block time and cancel ${clashesCount} ${clashesCount === 1 ? "booking" : "bookings"}`}
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs shadow-xs"
                >
                  {isPending ? "Blocking..." : "Block time"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
