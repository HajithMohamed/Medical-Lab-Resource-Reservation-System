import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/app/(auth)/change-password/change-password-form";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "Change password",
};

interface ChangePasswordPageProps {
  searchParams?: Promise<{ email?: string }>;
}

export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  if (!user) {
    const emailParam = resolvedSearchParams?.email
      ? `?email=${encodeURIComponent(resolvedSearchParams.email)}&fromChange=1`
      : "";
    redirect(`/login${emailParam}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#0b1322]">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="flex justify-center">
          <Logo subtitle="Lab resource reservations" />
        </div>

        <div className="rounded-2xl border border-[#334155] bg-[#141c2b] p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              {user.mustChangePassword
                ? "Choose a new password before you continue"
                : "Change password"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {user.mustChangePassword
                ? "Your manager set a temporary password for this account. Create your personal password to proceed."
                : "Update your laboratory account password."}
            </p>
          </div>

          <ChangePasswordForm mustChange={user.mustChangePassword} />
        </div>
      </div>
    </div>
  );
}
