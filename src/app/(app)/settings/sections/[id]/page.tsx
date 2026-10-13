import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSection } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { SectionEditForm } from "@/components/settings/section-edit-form";

export const metadata = {
  title: "Edit section | Settings",
};

export default async function EditSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("ADMIN");
  const { id } = await params;

  const result = await getSection(actor, id);
  if (!result.ok || !result.data) {
    notFound();
  }

  const section = result.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/sections"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Sections</span>
        </Link>
        <PageHeader
          title={`Edit ${section.name}`}
          description="Update section details or remove this department from the network."
        />
      </div>

      <SectionEditForm section={section} />
    </div>
  );
}
