import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { logout } from "@/actions/auth";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        siteName: user.siteName ?? (user.role === "ADMIN" ? "All sites" : undefined),
      }}
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
