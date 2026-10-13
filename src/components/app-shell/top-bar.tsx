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

export function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

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
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <div className="h-4 w-px bg-border" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={bc.href}>
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {bc.isLast ? (
                  <BreadcrumbPage className="font-semibold text-foreground">
                    {bc.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={bc.href}>{bc.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
