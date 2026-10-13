import * as React from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSettingsCounts } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { Building2, Layers, Tag, ChevronRight } from "lucide-react";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const actor = await requireRole("ADMIN");
  const result = await getSettingsCounts(actor);

  const counts = result.ok ? result.data : { sitesCount: 0, sectionsCount: 0, categoriesCount: 0 };

  const settingSections = [
    {
      title: "Sites",
      description: "Laboratories and branch locations in the network",
      count: `${counts.sitesCount} ${counts.sitesCount === 1 ? "site" : "sites"}`,
      href: "/settings/sites",
      icon: Building2,
    },
    {
      title: "Sections",
      description: "Laboratory departments and testing sections",
      count: `${counts.sectionsCount} ${counts.sectionsCount === 1 ? "section" : "sections"}`,
      href: "/settings/sections",
      icon: Layers,
    },
    {
      title: "Categories",
      description: "Resource types, booking duration rules and icons",
      count: `${counts.categoriesCount} ${counts.categoriesCount === 1 ? "category" : "categories"}`,
      href: "/settings/categories",
      icon: Tag,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage master registries and configuration for the lab network."
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs divide-y divide-border">
        {settingSections.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between p-4 sm:p-5 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-foreground">{item.title}</span>
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center text-muted-foreground">
                <ChevronRight className="size-5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
