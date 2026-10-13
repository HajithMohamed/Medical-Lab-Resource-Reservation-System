"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/app-shell/user-menu";
import { navItemsFor, type NavGroup, type NavItem } from "@/config/navigation";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AppSidebarProps {
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  logoutAction?: () => void | Promise<void>;
}

export function AppSidebar({ user, logoutAction }: AppSidebarProps) {
  const pathname = usePathname();
  const allowedItems = React.useMemo(() => navItemsFor(user.role), [user.role]);

  const siteSubtitle = user.role === "ADMIN" ? "All sites" : (user.siteName ?? "Main Laboratory");

  const grouped = React.useMemo(() => {
    const map = new Map<NavGroup, NavItem[]>();
    for (const item of allowedItems) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return map;
  }, [allowedItems]);

  const mainItems = grouped.get("main") ?? [];
  const manageItems = grouped.get("manage") ?? [];
  const adminItems = grouped.get("admin") ?? [];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Logo subtitle={siteSubtitle} />
      </SidebarHeader>

      {/* Quick Action Primary CTA */}
      <div className="p-3 pb-1 group-data-[collapsible=icon]:hidden">
        <Button
          asChild
          className="w-full justify-center gap-2 bg-primary text-primary-foreground font-semibold text-xs hover:brightness-110 active:scale-[0.99] transition-all shadow-xs"
        >
          <Link href="/resources">
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>New Reservation</span>
          </Link>
        </Button>
      </div>

      <SidebarContent className="px-2 py-1">
        {mainItems.length > 0 && (
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu>
                {mainItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-9.5 text-xs font-medium rounded-lg text-sidebar-foreground hover:bg-surface-container-high hover:text-foreground data-[active=true]:bg-surface-container-high data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className="flex items-center gap-2.5 w-full"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {manageItems.length > 0 && (
          <SidebarGroup className="p-0 pt-3">
            <SidebarGroupLabel className="text-[11px] font-mono uppercase tracking-wider text-sidebar-muted px-2 py-1">
              Manage
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {manageItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-9.5 text-xs font-medium rounded-lg text-sidebar-foreground hover:bg-surface-container-high hover:text-foreground data-[active=true]:bg-surface-container-high data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className="flex items-center gap-2.5 w-full"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {adminItems.length > 0 && (
          <SidebarGroup className="p-0 pt-3">
            <SidebarGroupLabel className="text-[11px] font-mono uppercase tracking-wider text-sidebar-muted px-2 py-1">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className="h-9.5 text-xs font-medium rounded-lg text-sidebar-foreground hover:bg-surface-container-high hover:text-foreground data-[active=true]:bg-surface-container-high data-[active=true]:text-primary data-[active=true]:font-semibold data-[active=true]:border-l-2 data-[active=true]:border-primary transition-all"
                      >
                        <Link
                          href={item.href}
                          aria-current={isActive ? "page" : undefined}
                          className="flex items-center gap-2.5 w-full"
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {isActive && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <UserMenu user={user} logoutAction={logoutAction} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
