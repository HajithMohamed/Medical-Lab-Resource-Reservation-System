import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { APP_TAGLINE } from "@/config/brand";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/calendar");
  }

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left panel: Navy glance panel */}
      <div className="bg-sidebar text-sidebar-foreground p-6 sm:p-10 lg:p-16 flex flex-col justify-between">
        <div className="space-y-6">
          <Logo subtitle={APP_TAGLINE} className="text-white" />

          <div className="hidden sm:block space-y-3 pt-4">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white max-w-md">
              One schedule for every instrument, cabinet, room and van.
            </h1>
            <p className="hidden lg:block text-sidebar-muted text-sm sm:text-base max-w-lg leading-relaxed">
              See what is free across the main lab and branch labs, book it in a minute, and know
              straight away when something is blocked for service.
            </p>
          </div>
        </div>

        {/* Decorative today glance schedule */}
        <div className="hidden lg:block pt-8">
          <p className="sr-only">
            Today&apos;s schedule preview: PCR machine 1 and HPLC system have active bookings and
            maintenance, Flow cytometer is out of service.
          </p>
          <div
            className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3 max-w-md"
            aria-hidden="true"
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-sidebar-muted">
              Today&apos;s schedule preview
            </div>

            {/* PCR machine 1 */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white">PCR machine 1</span>
              <div className="h-7 w-full bg-white/10 rounded relative overflow-hidden flex items-center text-[11px] font-bold">
                <span className="h-full bg-booking text-booking-ink px-2 flex items-center rounded-l w-[44%] truncate">
                  qPCR run
                </span>
                <span className="h-full bg-booking text-booking-ink px-2 flex items-center rounded-r ml-1 w-[28%] truncate">
                  Kandy samples
                </span>
              </div>
            </div>

            {/* HPLC system */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white">HPLC system</span>
              <div className="h-7 w-full bg-white/10 rounded relative overflow-hidden flex items-center text-[11px] font-bold">
                <span className="h-full bg-booking text-booking-ink px-2 flex items-center rounded-l ml-[5%] w-[40%] truncate">
                  HbA1c batch
                </span>
                <span className="h-full hatch-maint text-maint-ink px-2 flex items-center rounded-r ml-2 w-[22%] truncate">
                  Calibration
                </span>
              </div>
            </div>

            {/* Flow cytometer */}
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white">Flow cytometer</span>
              <div className="h-7 w-full hatch-oos rounded flex items-center px-2 text-[11px] font-bold text-tag-red">
                Out of service
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Sign-in form side */}
      <div className="bg-background flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-[400px] rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Sign in
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Enter your laboratory credentials to access reservations.
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
