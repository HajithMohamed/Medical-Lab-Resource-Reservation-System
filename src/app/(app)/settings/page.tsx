import * as React from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getSettingsCounts } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { Building2, Layers, Tag, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Settings | BenchBook",
};

export default async function SettingsPage() {
  const actor = await requireRole("ADMIN");
  const result = await getSettingsCounts(actor);

  const counts = result.ok ? result.data : { sitesCount: 0, sectionsCount: 0, categoriesCount: 0 };

  const settingCards = [
    {
      title: "Sites",
      subtitle: "Laboratories & Facilities",
      description:
        "Manage physical locations, laboratory branches, and campus facilities across the Sri Lanka lab network.",
      count: `${counts.sitesCount} ${counts.sitesCount === 1 ? "site" : "sites"}`,
      href: "/settings/sites",
      icon: Building2,
    },
    {
      title: "Sections",
      subtitle: "Lab Departments",
      description:
        "Manage functional divisions such as Molecular Diagnostics, Clinical Biochemistry, and Histopathology.",
      count: `${counts.sectionsCount} ${counts.sectionsCount === 1 ? "section" : "sections"}`,
      href: "/settings/sections",
      icon: Layers,
    },
    {
      title: "Categories",
      subtitle: "Equipment Rules & Constraints",
      description:
        "Configure equipment categories, max slot booking constraints, and icon classifications for instruments and rooms.",
      count: `${counts.categoriesCount} ${counts.categoriesCount === 1 ? "category" : "categories"}`,
      href: "/settings/categories",
      icon: Tag,
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        eyebrow="Administration"
        title="Settings & Registries"
        description="Manage master registries and system-wide operational configuration for BenchBook."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settingCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.href}
              className="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-card-edge bg-card shadow-v4 transition-all duration-200 hover:shadow-md hover:border-teal/40"
            >
              <div>
                <CardHeader className="pb-3 pt-6 px-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-teal-soft text-teal font-extrabold">
                      <Icon className="size-5" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-teal-soft text-teal-deep border border-teal-line px-3 py-1 text-xs font-extrabold tabular-nums">
                      {item.count}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight text-navy">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold text-muted">
                    {item.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-6 pt-1 pb-6">
                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                </CardContent>
              </div>

              <CardFooter className="p-6 pt-0 border-t border-line mt-auto">
                <Button
                  asChild
                  className="w-full h-11 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95 mt-4"
                >
                  <Link href={item.href} className="flex items-center justify-center gap-1.5">
                    <span>Manage {item.title}</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
