import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/app/(auth)/change-password/change-password-form";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "Change password",
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-background">
      <div className="w-full max-w-[480px] space-y-6">
        <div className="flex justify-center">
          <Logo subtitle="Lab resource reservations" />
        </div>

        <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {user.mustChangePassword
                ? "Choose a new password before you continue"
                : "Change password"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
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
