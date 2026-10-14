import * as React from "react";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { AppShell } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/page-header";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { EquipmentStatusTag } from "@/components/equipment/equipment-status-tag";
import { CategoryIcon, CATEGORY_ICON_MAP } from "@/components/category-icon";
import { EmptyState } from "@/components/empty-state";
import { SummaryStrip } from "@/components/summary-strip";
import { UtilisationBar } from "@/components/utilisation-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { StyleguideClientDemos } from "@/app/styleguide/styleguide-client";
import { Calendar as CalendarIcon, Info, AlertTriangle, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Styleguide",
};

export default function StyleguidePage() {
  if (env.NODE_ENV === "production") {
    notFound();
  }

  const demoUser = {
    name: "Kasun Silva",
    role: "STAFF",
    siteName: "Main Laboratory, Colombo",
  };

  return (
    <AppShell user={demoUser}>
      <div className="space-y-10 max-w-6xl">
        <PageHeader
          title="Design system styleguide"
          description="Visual test bed comparing BenchBook Tailwind & shadcn tokens against docs/design-reference.html."
        />

        {/* 1. BUTTONS */}
        <section aria-labelledby="section-buttons" className="space-y-4">
          <div>
            <h2 id="section-buttons" className="text-lg font-bold text-foreground">
              1. Buttons
            </h2>
            <p className="text-sm text-muted-foreground">
              Controls are 40px high (h-10). Primary uses bg-primary-hover on hover. Destructive is
              solid red with white text.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground w-20">Disabled:</span>
              <Button variant="default" disabled>
                Primary disabled
              </Button>
              <Button variant="secondary" disabled>
                Secondary disabled
              </Button>
              <Button variant="destructive" disabled>
                Destructive disabled
              </Button>
              <Button variant="ghost" disabled>
                Ghost disabled
              </Button>
            </div>
          </div>
        </section>

        {/* 2. FORMS & INPUTS */}
        <section aria-labelledby="section-inputs" className="space-y-4">
          <div>
            <h2 id="section-inputs" className="text-lg font-bold text-foreground">
              2. Inputs &amp; Form Fields
            </h2>
            <p className="text-sm text-muted-foreground">
              Labels are 15px font-semibold. Borders meet 3:1 non-text contrast against paper and
              card.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <div className="space-y-1.5">
                <Label htmlFor="demo-name">Resource name</Label>
                <Input id="demo-name" defaultValue="Real-time PCR machine 1" />
                <span className="text-xs text-muted-foreground">
                  Enter a descriptive title for this equipment.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="demo-location">Location</Label>
                <Input id="demo-location" placeholder="e.g. Molecular lab, room 2.14" />
              </div>

              {/* Field with error */}
              <div className="md:col-span-2">
                <Field data-invalid="true">
                  <FieldLabel htmlFor="demo-purpose">Purpose of reservation</FieldLabel>
                  <Input
                    id="demo-purpose"
                    defaultValue=""
                    aria-invalid="true"
                    aria-describedby="demo-purpose-error"
                    placeholder="e.g. qPCR run, respiratory panel"
                  />
                  <FieldDescription>Provide brief details for lab record keeping.</FieldDescription>
                  <FieldError id="demo-purpose-error">
                    Purpose is required for reservation confirmation.
                  </FieldError>
                </Field>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ALERTS */}
        <section aria-labelledby="section-alerts" className="space-y-4">
          <div>
            <h2 id="section-alerts" className="text-lg font-bold text-foreground">
              3. Alerts
            </h2>
            <p className="text-sm text-muted-foreground">
              Info, warning (maintenance amber), and error (destructive red).
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <Alert variant="default">
              <Info className="size-4" />
              <AlertTitle>Booking information</AlertTitle>
              <AlertDescription>
                Reservations in the Molecular Lab can be placed up to 14 days in advance.
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <AlertTriangle className="size-4" />
              <AlertTitle>Scheduled maintenance notice</AlertTitle>
              <AlertDescription>
                Annual calibration will take place on Wednesday 14 Oct from 14:00 to 16:00.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Booking clash detected</AlertTitle>
              <AlertDescription>
                This time clashes with Chamari Herath&apos;s booking, Tue 13 Oct, 11:00 to 13:00.
                Choose another time or see the calendar.
              </AlertDescription>
            </Alert>
          </div>
        </section>

        {/* 4. STATUS TAGS & PILLS */}
        <section aria-labelledby="section-statuses" className="space-y-4">
          <div>
            <h2 id="section-statuses" className="text-lg font-bold text-foreground">
              4. Status Language: Equipment Tags &amp; Account Pills
            </h2>
            <p className="text-sm text-muted-foreground">
              Equipment uses hang tags with a punched hole. Accounts and usage use rounded pills.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Resource status (Equipment hang tags)
              </h3>
              <div className="flex flex-wrap items-center gap-4">
                <ResourceStatusTag status="ACTIVE" />
                <ResourceStatusTag status="OUT_OF_SERVICE" />
                <ResourceStatusTag status="RETIRED" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Account status pills (User management)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[13px] font-bold bg-pass-bg text-pass border border-pass/30">
                  Active
                </span>
                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[13px] font-bold bg-secondary text-secondary-foreground border border-primary/20">
                  Must change password
                </span>
                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[13px] font-bold bg-maint text-maint-ink border border-maint-edge/30">
                  Locked
                </span>
                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[13px] font-bold bg-muted text-muted-foreground border border-border">
                  Inactive
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Usage pills</h3>
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[13px] font-bold bg-primary text-primary-foreground">
                  Busy
                </span>
                <span className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[13px] font-bold bg-muted text-muted-foreground border border-border">
                  Idle
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                Equipment care &amp; verification status tags (ISO 15189)
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <EquipmentStatusTag status="CURRENT" label="Current" />
                <EquipmentStatusTag status="DUE_SOON" label="Due soon" />
                <EquipmentStatusTag status="DUE_TODAY" label="Due today" />
                <EquipmentStatusTag status="OVERDUE" label="Overdue" />
                <EquipmentStatusTag status="FAILED" label="Failed" />
                <EquipmentStatusTag status="NOT_TRACKED" label="Not tracked" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. CATEGORY ICONS */}
        <section aria-labelledby="section-categories" className="space-y-4">
          <div>
            <h2 id="section-categories" className="text-lg font-bold text-foreground">
              5. Category Icons (30px rounded tiles)
            </h2>
            <p className="text-sm text-muted-foreground">
              8 curated Lucide icons mapped to lab categories, with fallback to Box.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.keys(CATEGORY_ICON_MAP).map((key) => (
                <div key={key} className="flex items-center gap-3 p-2 rounded-lg bg-background/50">
                  <CategoryIcon iconKey={key} />
                  <span className="text-sm font-medium capitalize text-foreground">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. SUMMARY STRIP & UTILISATION BARS */}
        <section aria-labelledby="section-metrics" className="space-y-4">
          <div>
            <h2 id="section-metrics" className="text-lg font-bold text-foreground">
              6. Summary Strip &amp; Utilisation Bars
            </h2>
            <p className="text-sm text-muted-foreground">
              One bordered panel with dividers for key metrics, and 10px rounded utilisation bars.
            </p>
          </div>
          <div className="space-y-4">
            <SummaryStrip
              items={[
                { label: "Booked", value: "412 h" },
                { label: "Average utilisation", value: "34%" },
                { label: "Maintenance", value: "9 h" },
                { label: "Cancelled bookings", value: "6" },
              ]}
            />

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Utilisation Bars</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm py-1 border-b border-border/60">
                  <span className="font-semibold text-foreground">Real-time PCR machine 1</span>
                  <div className="flex items-center gap-3">
                    <UtilisationBar percent={78} />
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                      Busy
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm py-1 border-b border-border/60">
                  <span className="font-semibold text-foreground">HPLC system</span>
                  <div className="flex items-center gap-3">
                    <UtilisationBar percent={40} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm py-1">
                  <span className="font-semibold text-foreground">Training room</span>
                  <div className="flex items-center gap-3">
                    <UtilisationBar percent={6} />
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                      Idle
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. INTERACTIVE DEMOS */}
        <section aria-labelledby="section-interactive" className="space-y-4">
          <div>
            <h2 id="section-interactive" className="text-lg font-bold text-foreground">
              7. Interactive Demos (Toast, Confirm Dialog &amp; Pending State)
            </h2>
            <p className="text-sm text-muted-foreground">
              Accessible AlertDialog confirming destructive actions, sonner toast, and loading
              indicators.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <StyleguideClientDemos />
          </div>
        </section>

        {/* 8. EMPTY STATE */}
        <section aria-labelledby="section-empty" className="space-y-4">
          <div>
            <h2 id="section-empty" className="text-lg font-bold text-foreground">
              8. Empty State
            </h2>
            <p className="text-sm text-muted-foreground">
              Soft circle icon, friendly prompt, and clear next action.
            </p>
          </div>
          <EmptyState
            icon={CalendarIcon}
            title="No upcoming bookings"
            description="You have no bookings scheduled for this week. Find a free slot on the calendar to reserve equipment."
            action={<Button variant="default">Find a free slot</Button>}
          />
        </section>

        {/* 9. STATIC CALENDAR SAMPLE */}
        <section aria-labelledby="section-calendar" className="space-y-4">
          <div>
            <h2 id="section-calendar" className="text-lg font-bold text-foreground">
              9. Static Calendar Sample (Signature Grid)
            </h2>
            <p className="text-sm text-muted-foreground">
              Matches docs/design-reference.html: one booking block, one &quot;mine&quot; block with
              &quot;You&quot; chip, one hatch-maint block, and one hatch-oos column with Out of
              service tag.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                {/* Header columns */}
                <div className="grid grid-cols-[64px_repeat(3,1fr)] border-b border-border bg-card">
                  <div className="p-3 border-r border-border" />
                  <div className="p-3 border-r border-border">
                    <b className="block text-sm font-bold text-foreground">
                      Real-time PCR machine 1
                    </b>
                    <span className="text-xs text-muted-foreground">Molecular instruments</span>
                  </div>
                  <div className="p-3 border-r border-border">
                    <b className="block text-sm font-bold text-foreground">HPLC system</b>
                    <span className="text-xs text-muted-foreground">Analytical instruments</span>
                  </div>
                  <div className="p-3">
                    <b className="block text-sm font-bold text-foreground">Flow cytometer</b>
                    <div className="mt-1">
                      <ResourceStatusTag status="OUT_OF_SERVICE" />
                    </div>
                  </div>
                </div>

                {/* Calendar grid rows */}
                <div className="grid grid-cols-[64px_repeat(3,1fr)]">
                  {/* Time ruler */}
                  <div className="border-r border-border bg-card divide-y divide-border text-xs text-muted-foreground tabular-nums text-right pr-2 font-medium">
                    <div className="h-16 pt-1">08:00</div>
                    <div className="h-16 pt-1">10:00</div>
                    <div className="h-16 pt-1">12:00</div>
                    <div className="h-16 pt-1">14:00</div>
                    <div className="h-16 pt-1">16:00</div>
                  </div>

                  {/* Col 1: PCR machine 1 */}
                  <div className="border-r border-border p-1.5 space-y-2 bg-card">
                    {/* "Mine" block with "You" chip */}
                    <div className="relative rounded-[6px] p-2.5 bg-mine text-mine-foreground shadow-[inset_3px_0_0_#073a4a] text-xs leading-snug">
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-white text-primary px-1.5 py-0.2 rounded-full leading-tight">
                        You
                      </span>
                      <b className="block text-sm font-bold pr-8">qPCR run, respiratory panel</b>
                      <span className="block tabular-nums opacity-90 mt-1">08:00 to 11:00</span>
                    </div>

                    {/* Someone else's booking block */}
                    <div className="relative rounded-[6px] p-2.5 bg-booking text-booking-ink shadow-[inset_3px_0_0_var(--color-booking-edge)] text-xs leading-snug">
                      <b className="block text-sm font-bold">qPCR run, samples from Kandy</b>
                      <span className="block text-booking-ink/80">Chamari Herath, Kandy</span>
                      <span className="block tabular-nums font-semibold mt-1">11:00 to 13:00</span>
                    </div>

                    <div className="h-32 rounded border border-dashed border-border/80 hover:bg-secondary/30 transition-colors flex items-center justify-center text-xs text-muted-foreground">
                      Free slot (Click to book)
                    </div>
                  </div>

                  {/* Col 2: HPLC system */}
                  <div className="border-r border-border p-1.5 space-y-2 bg-card">
                    <div className="h-28 rounded border border-dashed border-border/80 hover:bg-secondary/30 transition-colors flex items-center justify-center text-xs text-muted-foreground">
                      Free slot
                    </div>

                    {/* Maintenance block with caution hatching */}
                    <div className="hatch-maint rounded-[6px] p-2.5 text-maint-ink shadow-[inset_3px_0_0_var(--color-maint-edge),inset_0_0_0_1px_#e9c3a6] text-xs leading-snug">
                      <b className="block text-sm font-bold">Maintenance</b>
                      <span className="block opacity-90">
                        Annual calibration (service engineer)
                      </span>
                      <span className="block tabular-nums font-semibold mt-1">14:00 to 16:00</span>
                    </div>
                  </div>

                  {/* Col 3: Out of service column */}
                  <div className="hatch-oos p-3 flex flex-col items-center justify-center text-center">
                    <ResourceStatusTag status="OUT_OF_SERVICE" />
                    <span className="text-xs text-muted-foreground mt-2 font-medium max-w-[140px]">
                      Resource unavailable for reservations
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar legend */}
            <div className="border-t border-border p-4 bg-muted/30 flex flex-wrap items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-3.5 rounded-sm bg-booking border-l-[3px] border-booking-edge" />
                Booking
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-3.5 rounded-sm bg-mine border-l-[3px] border-[#073a4a]" />
                Your booking
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-3.5 rounded-sm hatch-maint border-l-[3px] border-maint-edge" />
                Maintenance
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-3.5 rounded-sm hatch-oos" />
                Out of service
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-5 h-3.5 rounded-sm bg-off-hours border border-border" />
                Outside standard hours
              </span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
