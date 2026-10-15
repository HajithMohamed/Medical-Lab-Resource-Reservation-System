"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { TopBar } from "@/components/app-shell/top-bar";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";

export interface AppShellProps {
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  dueCount?: number;
  logoutAction?: () => void | Promise<void>;
  children: React.ReactNode;
}

export function AppShell({ user, dueCount = 0, logoutAction, children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  return (
    <NotificationsProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-teal focus:text-white focus:rounded-xl focus:shadow-md focus:ring-2 focus:ring-focus font-semibold text-xs"
      >
        Skip to content
      </a>

      <div className="min-h-screen w-full flex flex-col md:flex-row">
        {/* Desktop Fixed Sidebar (>= 768px) */}
        <div className="hidden md:flex fixed top-0 bottom-0 left-0 w-64 h-screen z-30 shrink-0 flex-col">
          <AppSidebar
            user={user}
            dueCount={dueCount}
            logoutAction={logoutAction}
            className="h-full w-full rounded-none border-t-0 border-b-0 border-l-0 border-r border-card-edge shadow-none"
          />
        </div>

        {/* Mobile Drawer (< 768px) */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="left"
            className="w-[282px] max-w-[85vw] p-0 bg-card border-r border-card-edge shadow-v4 flex flex-col justify-between h-full"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            <AppSidebar
              user={user}
              dueCount={dueCount}
              logoutAction={logoutAction}
              onItemClick={() => setDrawerOpen(false)}
              className="w-full h-full border-0 shadow-none p-4 rounded-none bg-transparent"
            />
          </SheetContent>
        </Sheet>

        {/* Main Column: Top Bar + Page Content (fills 100% full width of screen) */}
        <div className="flex flex-col min-w-0 flex-1 w-full md:pl-64">
          <TopBar onMenuClick={() => setDrawerOpen(true)} user={user} logoutAction={logoutAction} />
          <main id="main" className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 w-full">
            {children}
          </main>
        </div>
      </div>
    </NotificationsProvider>
  );
}
