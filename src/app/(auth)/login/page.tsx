import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { MicroscopeStage } from "@/app/(auth)/login/microscope-stage";
import { Check } from "lucide-react";

export const metadata = {
  title: "Sign in | BenchBook",
  description:
    "Medical Lab Resource Reservation System — Sign in to access laboratory equipment and facilities.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/calendar");
  }

  return (
    <main className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden grid grid-cols-1 lg:grid-cols-[46%_54%] bg-background">
      {/* ======================================================== */}
      {/* Left Panel: Laboratory Hero matching reference layout   */}
      {/* ======================================================== */}
      <section
        aria-label="Laboratory system overview"
        className="bg-sidebar text-sidebar-foreground p-6 lg:p-8 xl:p-10 flex flex-col justify-between h-full relative overflow-hidden"
      >
        {/* Subtle decorative background ambient curves */}
        <div
          className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-sidebar-accent/40 blur-2xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full bg-secondary/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Top: Brand and Headlines matching reference SVG */}
        <div className="relative z-10 space-y-2">
          {/* Brand header badge */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[14px] bg-secondary/20 border border-white/15 flex items-center justify-center shrink-0 shadow-xs">
              <svg width="24" height="24" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle
                  cx="24"
                  cy="24"
                  r="16"
                  stroke="var(--color-secondary)"
                  strokeWidth="1.5"
                  strokeOpacity="0.45"
                />
                <path
                  d="M24 10v28M10 24h28"
                  stroke="var(--color-secondary)"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-base tracking-tight leading-tight">
                BenchBook Pro
              </div>
              <div className="text-sidebar-muted text-[10.5px] font-bold tracking-[1.2px] uppercase">
                PRECISION CLINICAL OPS
              </div>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-bold tracking-[2.2px] uppercase text-primary">
              MEDICAL LAB RESOURCE RESERVATION
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold tracking-tight text-white leading-tight mt-1">
              Better lab access.
              <br />
              More time for discovery.
            </h1>
            <p className="text-sidebar-muted text-xs sm:text-[13.5px] leading-relaxed mt-1.5 max-w-sm">
              Precision instrument allocation, collision prevention, and compliance tracking.
            </p>
          </div>
        </div>

        {/* Center: Static Microscope SVG illustration matching reference */}
        <div className="relative z-10 my-auto py-1 flex items-center justify-center">
          <MicroscopeStage />
        </div>

        {/* Bottom: Benefits Strip */}
        <div className="relative z-10 pt-3 border-t border-sidebar-border space-y-1.5">
          <div className="grid grid-cols-3 gap-2 text-sidebar-foreground">
            <div className="flex items-center gap-1.5 border-r border-sidebar-border pr-2">
              <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Check className="size-2.5 text-secondary-foreground stroke-[3]" />
              </div>
              <span className="text-[11px] font-medium leading-tight truncate">
                Equipment availability
              </span>
            </div>

            <div className="flex items-center gap-1.5 border-r border-sidebar-border pr-2">
              <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Check className="size-2.5 text-secondary-foreground stroke-[3]" />
              </div>
              <span className="text-[11px] font-medium leading-tight truncate">
                Zero conflict runs
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                <Check className="size-2.5 text-secondary-foreground stroke-[3]" />
              </div>
              <span className="text-[11px] font-medium leading-tight truncate">
                Clinical compliance
              </span>
            </div>
          </div>

          <p className="text-[11px] text-sidebar-muted">
            Designed for high-throughput diagnostic and research laboratories.
          </p>
        </div>
      </section>

      {/* ======================================================== */}
      {/* Right Panel: Floating Card matching reference layout     */}
      {/* ======================================================== */}
      <section
        aria-label="Staff sign-in"
        className="flex flex-col justify-between p-6 lg:p-8 xl:p-10 h-full bg-background"
      >
        {/* Top helper link */}
        <div className="flex justify-end text-xs text-muted-foreground">
          <span>
            Need access?{" "}
            <a
              href="mailto:admin@lab.example?subject=Lab%20Access%20Request"
              className="text-primary font-bold hover:underline"
            >
              Contact your lab administrator
            </a>
          </span>
        </div>

        {/* Center: Card matching reference shape and proportions */}
        <div className="my-auto py-1 flex justify-center">
          <div className="w-full max-w-[450px] rounded-[24px] border border-border bg-card p-7 sm:p-8 shadow-xs space-y-4">
            {/* Top brand icon badge inside card */}
            <div className="w-11 h-11 rounded-[14px] bg-secondary/50 border border-secondary/60 flex items-center justify-center mb-1 text-primary shadow-2xs">
              <svg width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                <circle
                  cx="24"
                  cy="24"
                  r="16"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
                <path
                  d="M24 10v28M10 24h28"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Sign in to continue to your lab workspace.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>

        {/* Bottom footer text */}
        <div className="text-center text-[11px] text-muted-foreground">
          BenchBook Pro • Precision Clinical Operations Console
        </div>
      </section>
    </main>
  );
}
