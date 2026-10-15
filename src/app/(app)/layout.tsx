import * as React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { logout } from "@/actions/auth";
import { listTodayTasks } from "@/services/equipment";

export default async function AppShellLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  let dueCount = 0;
  if (user.role === "MANAGER" || user.role === "ADMIN") {
    try {
      const tasksRes = await listTodayTasks(user);
      if (tasksRes.ok) {
        dueCount = tasksRes.data.length;
      }
    } catch {
      // Non-fatal if tasks fail to load
    }
  }

  return (
    <AppShell
      user={{
        name: user.name,
        role: user.role,
        siteName: user.siteName ?? (user.role === "ADMIN" ? "All sites" : undefined),
      }}
      dueCount={dueCount}
      logoutAction={logout}
    >
      {children}
      {modal}
    </AppShell>
  );
}
