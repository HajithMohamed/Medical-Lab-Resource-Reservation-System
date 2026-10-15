import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ResourceForm } from "@/components/resources/resource-form";

export const metadata = {
  title: "Add resource | BenchBook",
};

export default async function NewResourcePage() {
  const actor = await requireRole("MANAGER", "ADMIN");

  const [sites, categories, sections] = await Promise.all([
    db.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: {
        id: true,
        name: true,
        maxBookingMinutes: true,
        iconKey: true,
      },
      orderBy: { name: "asc" },
    }),
    db.section.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6 w-full">
      <div>
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to resources</span>
        </Link>
        <PageHeader
          eyebrow="Resources / New"
          title="Add resource"
          description="Fill in the basics. Equipment and schedule sections appear only for instruments."
        />
      </div>

      <ResourceForm
        actorRole={actor.role}
        actorSiteId={actor.siteId}
        sites={sites}
        categories={categories}
        sections={sections}
      />
    </div>
  );
}
