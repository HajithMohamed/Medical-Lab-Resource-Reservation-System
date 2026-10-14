"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NAV_ITEMS } from "@/config/navigation";
import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Live Asia/Colombo Chronometer
  const [colomboTime, setColomboTime] = React.useState<{
    dateStr: string;
    timeStr: string;
  } | null>(null);

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Colombo",
      }).format(now);
      const timeStr = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Colombo",
      }).format(now);
      setColomboTime({ dateStr, timeStr });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const breadcrumbs = React.useMemo(() => {
    if (segments.length === 0) {
      return [{ label: "Home", href: "/", isLast: true }];
    }

    const items = [];
    let currentPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;
      const isLast = i === segments.length - 1;

      const navItem = NAV_ITEMS.find((n) => n.href === currentPath);
      let label = navItem?.label;

      if (!label) {
        label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
      }

      items.push({ label, href: currentPath, isLast });
    }

    return items;
  }, [segments]);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#334155] bg-[#141c2b]/95 px-4 backdrop-blur-md">
      {/* Left: Sidebar trigger & breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="-ml-1 text-[#dbe2f8] hover:text-white" />
        <div className="h-4 w-px bg-[#334155] shrink-0" />
        <Breadcrumb className="truncate">
          <BreadcrumbList>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={bc.href}>
                {idx > 0 && <BreadcrumbSeparator className="text-[#94a3b8]" />}
                <BreadcrumbItem>
                  {bc.isLast ? (
                    <BreadcrumbPage className="font-semibold text-white truncate">
                      {bc.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={bc.href} className="text-[#94a3b8] hover:text-white">
                        {bc.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Center: Live Asia/Colombo Precision Chronometer */}
      <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded bg-[#060e1d] border border-[#334155] font-mono text-xs shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-[#6cd8cb] animate-pulse" />
        <span className="text-[#94a3b8]">{colomboTime?.dateStr ?? "Asia/Colombo"}</span>
        <span className="text-[#334155]">•</span>
        <span className="text-[#6cd8cb] font-bold tabular-nums tracking-wider">
          {colomboTime?.timeStr ?? "--:--:--"}
        </span>
        <span className="text-[#94a3b8] text-[10px]">Colombo (UTC+5:30)</span>
      </div>

      {/* Right: Location & Quick Action CTA */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden xl:flex items-center gap-2 text-xs text-[#94a3b8]">
          <MapPin className="size-3.5 text-[#6cd8cb] shrink-0" />
          <span className="font-medium text-white">Main Lab</span>
          <span className="text-[#334155]">/</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#222a3a] text-[#6cd8cb] border border-[#6cd8cb]/30">
            Core Grid
          </span>
        </div>

        <Button
          asChild
          size="sm"
          className="h-8 px-3 gap-1.5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono active:scale-[0.98] transition-all shadow-xs"
        >
          <Link href="/resources">
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>New Reservation</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
