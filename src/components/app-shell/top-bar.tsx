"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { UserMenu } from "@/components/app-shell/user-menu";
import { NAV_ITEMS } from "@/config/navigation";

export interface TopBarProps {
  onMenuClick: () => void;
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  logoutAction?: () => void | Promise<void>;
}

export function TopBar({ onMenuClick, user, logoutAction }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchVal, setSearchVal] = React.useState("");

  // Determine current page title for the mobile eyebrow
  const pageTitle = React.useMemo(() => {
    const navMatch = NAV_ITEMS.find((item) => {
      if (item.href.includes("?")) {
        return pathname === item.href.split("?")[0];
      }
      return pathname === item.href;
    });
    if (navMatch) return navMatch.label.toUpperCase();
    if (pathname.startsWith("/resources/")) return "RESOURCE DETAILS";
    if (pathname.startsWith("/reservations/")) return "BOOKING DETAILS";
    if (pathname.startsWith("/equipment")) return "EQUIPMENT CARE";
    if (pathname.startsWith("/settings")) return "SETTINGS";
    return "WORKSPACE";
  }, [pathname]);

  const siteDisplay = user.siteName ?? (user.role === "ADMIN" ? "All sites" : "Colombo site");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/resources?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 w-full bg-canvas/85 backdrop-blur-md border-b border-card-edge px-4 sm:px-6 lg:px-8 py-3 transition-colors">
      {/* Mobile Top Bar (< 768px) */}
      <div className="flex md:hidden items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="w-10 h-10 rounded-xl bg-card border border-card-edge flex items-center justify-center text-navy shadow-2xs hover:bg-mint transition-colors cursor-pointer shrink-0"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-extrabold tracking-[0.14em] text-teal uppercase leading-tight truncate">
              BENCHBOOK / {pageTitle}
            </span>
            <span className="text-[12px] font-bold text-navy leading-tight truncate mt-0.5">
              {siteDisplay}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <NotificationsBell />
          <UserMenu user={user} logoutAction={logoutAction} minimal />
        </div>
      </div>

      {/* Desktop Top Header Bar (>= 768px) */}
      <div className="hidden md:flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold tracking-[0.14em] text-teal uppercase">
            BenchBook
          </span>
          <span className="text-muted text-xs">/</span>
          <span className="text-xs font-bold text-navy">{siteDisplay}</span>
        </div>

        {/* Right Tools: Search input, Bell, User */}
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="size-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search resources"
              className="h-10 w-44 xl:w-60 pl-9 pr-3 rounded-xl border border-card-edge bg-card text-xs text-navy font-semibold placeholder:text-muted/80 shadow-2xs outline-none focus:border-teal focus:ring-2 focus:ring-focus transition-all"
            />
          </form>

          <NotificationsBell />
          <UserMenu user={user} logoutAction={logoutAction} minimal />
        </div>
      </div>
    </header>
  );
}
