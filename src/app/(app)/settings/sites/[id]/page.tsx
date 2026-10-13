import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSite } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { SiteEditForm } from "@/components/settings/site-edit-form";

export const metadata = {
  title: "Edit site | Settings",
};

export default async function EditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("ADMIN");
  const { id } = await params;

  const result = await getSite(actor, id);
  if (!result.ok || !result.data) {
    notFound();
  }

  const site = result.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/sites"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Sites</span>
        </Link>
        <PageHeader
          title={`Edit ${site.name}`}
          description="Update site details or remove this location from the network."
        />
      </div>

      <SiteEditForm site={site} />
    </div>
  );
}
