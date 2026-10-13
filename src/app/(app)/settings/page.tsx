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
  title: "Settings",
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
        "Manage physical locations, laboratory branches, and campus facilities in the lab network.",
      count: `${counts.sitesCount} ${counts.sitesCount === 1 ? "site" : "sites"}`,
      href: "/settings/sites",
      icon: Building2,
      accentColor: "from-[#0E6A85]/20 to-[#0B3D52]/10",
      iconBg: "bg-primary text-primary-foreground",
      badgeClass: "bg-primary/10 text-primary border-primary/20",
      illustration: (
        <svg
          className="w-full h-28"
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="240" height="100" rx="8" fill="#F4F7F8" />
          <path
            d="M20 85L20 45L55 25L90 45L90 85H20Z"
            fill="#DCEEF4"
            stroke="#0E6A85"
            strokeWidth="2"
          />
          <rect
            x="35"
            y="55"
            width="12"
            height="16"
            rx="2"
            fill="#FFFFFF"
            stroke="#0E6A85"
            strokeWidth="1.5"
          />
          <rect
            x="63"
            y="55"
            width="12"
            height="16"
            rx="2"
            fill="#FFFFFF"
            stroke="#0E6A85"
            strokeWidth="1.5"
          />
          <path d="M50 85V72H60V85" stroke="#0E6A85" strokeWidth="2" fill="#FFFFFF" />
          <rect
            x="105"
            y="35"
            width="115"
            height="50"
            rx="4"
            fill="#FFFFFF"
            stroke="#D9E1E5"
            strokeWidth="1.5"
          />
          <line
            x1="120"
            y1="50"
            x2="205"
            y2="50"
            stroke="#0E6A85"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line
            x1="120"
            y1="62"
            x2="185"
            y2="62"
            stroke="#5B6B73"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <line
            x1="120"
            y1="72"
            x2="165"
            y2="72"
            stroke="#9DB5C0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="205" cy="62" r="5" fill="#1F7A4D" />
        </svg>
      ),
    },
    {
      title: "Sections",
      subtitle: "Lab Departments",
      description:
        "Manage functional divisions such as Haematology, Biochemistry, and Histopathology.",
      count: `${counts.sectionsCount} ${counts.sectionsCount === 1 ? "section" : "sections"}`,
      href: "/settings/sections",
      icon: Layers,
      accentColor: "from-[#12506A]/20 to-[#DCEEF4]/30",
      iconBg: "bg-[#0B3D52] text-white",
      badgeClass: "bg-[#0B3D52]/10 text-[#0B3D52] border-[#0B3D52]/20",
      illustration: (
        <svg
          className="w-full h-28"
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="240" height="100" rx="8" fill="#F4F7F8" />
          <rect
            x="30"
            y="25"
            width="45"
            height="60"
            rx="6"
            fill="#DCEEF4"
            stroke="#0E6A85"
            strokeWidth="1.5"
          />
          <rect
            x="90"
            y="25"
            width="45"
            height="60"
            rx="6"
            fill="#FFFFFF"
            stroke="#0E6A85"
            strokeWidth="1.5"
          />
          <rect
            x="150"
            y="25"
            width="60"
            height="60"
            rx="6"
            fill="#FFFFFF"
            stroke="#D9E1E5"
            strokeWidth="1.5"
          />
          <path
            d="M45 40H60M45 52H60M45 64H55"
            stroke="#0E6A85"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M105 40H120M105 52H120M105 64H115"
            stroke="#0B4F64"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="170" cy="55" r="8" fill="#DCEEF4" stroke="#0E6A85" strokeWidth="1.5" />
          <path d="M168 55L173 51" stroke="#0E6A85" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      title: "Categories",
      subtitle: "Equipment Rules & Icons",
      description:
        "Configure equipment categories, duration constraints, and icons for instruments and rooms.",
      count: `${counts.categoriesCount} ${counts.categoriesCount === 1 ? "category" : "categories"}`,
      href: "/settings/categories",
      icon: Tag,
      accentColor: "from-[#3A8FA8]/20 to-[#0E6A85]/10",
      iconBg: "bg-[#3A8FA8] text-white",
      badgeClass: "bg-[#3A8FA8]/15 text-[#0B4F64] border-[#3A8FA8]/30",
      illustration: (
        <svg
          className="w-full h-28"
          viewBox="0 0 240 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="240" height="100" rx="8" fill="#F4F7F8" />
          <circle cx="45" cy="50" r="22" fill="#DCEEF4" stroke="#0E6A85" strokeWidth="1.5" />
          <path
            d="M38 52C40 45 50 45 52 52"
            stroke="#0E6A85"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="45" cy="42" r="3" fill="#0E6A85" />
          <circle cx="105" cy="50" r="22" fill="#FFFFFF" stroke="#0E6A85" strokeWidth="1.5" />
          <path d="M98 56L105 40L112 56H98Z" fill="#DCEEF4" stroke="#0E6A85" strokeWidth="1.5" />
          <circle cx="165" cy="50" r="22" fill="#FFFFFF" stroke="#D9E1E5" strokeWidth="1.5" />
          <rect
            x="155"
            y="42"
            width="20"
            height="16"
            rx="2"
            fill="#EEF1F3"
            stroke="#5B6B73"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage master registries and configuration for the lab network."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {settingCards.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.href}
              className="group flex flex-col justify-between overflow-hidden border-border transition-all duration-200 hover:shadow-md hover:border-primary/40"
            >
              <div>
                <div className="p-4 bg-muted/30 border-b border-border/50">{item.illustration}</div>

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`flex size-10 items-center justify-center rounded-lg ${item.iconBg}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums ${item.badgeClass}`}
                    >
                      {item.count}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {item.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </div>

              <CardFooter className="pt-0 border-t border-border/40 bg-card">
                <Button asChild className="w-full gap-2 mt-3 group-hover:bg-primary-hover">
                  <Link href={item.href}>
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
