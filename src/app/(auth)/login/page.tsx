import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { getLabTimeZone } from "@/lib/time";

export const metadata = {
  title: "Sign in | BenchBook",
  description:
    "Medical Lab Resource Reservation System — Sign in to access laboratory equipment and facilities.",
};

interface LoginPageProps {
  searchParams?: Promise<{ email?: string; fromChange?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  if (user) {
    redirect("/calendar");
  }

  const zone = getLabTimeZone();
  const zoneCity = zone.split("/").pop()?.replace(/_/g, " ") ?? zone;

  return (
    <main className="min-h-screen flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8">
      {/* Spacer top */}
      <div className="w-full" />

      {/* Centered Login Card */}
      <div className="w-full max-w-[420px] space-y-6">
        {/* Brand header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal to-teal-deep text-white shadow-lg">
            <svg
              className="size-9"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3h6M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3" />
              <path d="M7.5 15h9" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-navy">
              BENCH<span className="text-teal">BOOK</span>
            </div>
            <div className="text-[10px] font-extrabold tracking-[1.4px] uppercase text-muted">
              PRO · LAB OPERATIONS
            </div>
          </div>
        </div>

        {/* White Card */}
        <div className="rounded-[20px] bg-card border border-card-edge p-6 sm:p-8 shadow-v4 space-y-5">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-navy tracking-tight">Sign in</h1>
            <p className="text-xs text-muted">Use the email your manager set up.</p>
          </div>

          <LoginForm defaultEmail={resolvedSearchParams?.email} />
        </div>
      </div>

      {/* Footer */}
      <footer className="text-xs text-faint font-medium text-center py-4">
        Times are {zoneCity} time
      </footer>
    </main>
  );
}
