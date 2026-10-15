"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/app-shell/user-menu";
import { getNavigationForRole, type NavItemConfig } from "@/config/navigation";
import { cn } from "@/lib/utils";

export interface AppSidebarProps {
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  dueCount?: number;
  logoutAction?: () => void | Promise<void>;
  onItemClick?: () => void;
  className?: string;
}

export function AppSidebar({
  user,
  dueCount = 0,
  logoutAction,
  onItemClick,
  className,
}: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const groups = React.useMemo(
    () => getNavigationForRole(user.role, user.siteName),
    [user.role, user.siteName],
  );

  const isItemActive = React.useCallback(
    (href: string) => {
      if (href.includes("?")) {
        const [targetPath, queryString] = href.split("?");
        if (pathname !== targetPath) return false;
        const targetTab = new URLSearchParams(queryString).get("tab");
        const currentTab = searchParams?.get("tab") || "today";
        return targetTab === currentTab;
      }
      return pathname === href || (pathname.startsWith(href + "/") && href !== "/");
    },
    [pathname, searchParams],
  );

  return (
    <aside
      className={cn(
        "w-64 bg-card/95 backdrop-blur-md border-r border-card-edge p-4 flex flex-col justify-between shrink-0 h-full overflow-hidden",
        className,
      )}
      aria-label="Main navigation"
    >
      {/* Top: Brand mark & nav */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        <div className="px-2 pt-1 pb-3 shrink-0">
          <Logo
            subtitle={
              user.siteName ? `PRO · ${user.siteName.toUpperCase()}` : "PRO · LAB OPERATIONS"
            }
          />
        </div>

        {/* Grouped navigation */}
        <div className="space-y-4 pt-1 overflow-y-auto flex-1 pr-1">
          {groups.map((group) => (
            <div key={group.eyebrow} className="space-y-1">
              <div className="text-[10.5px] font-black tracking-[0.14em] text-navy/70 uppercase px-3 py-1">
                {group.eyebrow}
              </div>
              <nav className="space-y-0.5" aria-label={group.eyebrow}>
                {group.items.map((item: NavItemConfig) => {
                  const active = isItemActive(item.href);
                  const Icon = item.icon;
                  const showBadge = item.badge === "dueCount" && dueCount > 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onItemClick}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 px-3 h-10 rounded-xl text-[13px] font-semibold transition-all border outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        active
                          ? "bg-teal-soft border-teal-line text-teal-deep font-bold before:absolute before:-left-1 before:top-2.5 before:bottom-2.5 before:w-[3px] before:rounded-full before:bg-teal"
                          : "border-transparent text-navy hover:bg-mint hover:text-teal-deep",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-5 shrink-0 transition-colors",
                          active ? "text-teal" : "text-muted group-hover:text-teal-deep",
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                      {showBadge && (
                        <span
                          className="ml-auto text-[11px] font-extrabold text-amber bg-amber-soft border border-amber-line rounded-full px-2 py-0.2 tab shrink-0"
                          aria-label={`${dueCount} tasks needing attention`}
                        >
                          {dueCount < 10 ? `0${dueCount}` : dueCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: User block */}
      <div className="pt-3 mt-2 border-t border-line shrink-0">
        <UserMenu user={user} logoutAction={logoutAction} />
      </div>
    </aside>
  );
}
