import * as React from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { TopBar } from "@/components/app-shell/top-bar";

export interface AppShellProps {
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  logoutAction?: () => void | Promise<void>;
  children: React.ReactNode;
}

export function AppShell({ user, logoutAction, children }: AppShellProps) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-md focus:ring-3 focus:ring-ring"
      >
        Skip to content
      </a>
      <SidebarProvider>
        <AppSidebar user={user} logoutAction={logoutAction} />
        <SidebarInset id="main" className="flex flex-col min-h-screen bg-background">
          <TopBar />
          <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
