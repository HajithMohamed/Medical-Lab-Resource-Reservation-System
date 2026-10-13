import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCategory } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { CategoryEditForm } from "@/components/settings/category-edit-form";

export const metadata = {
  title: "Edit category | Settings",
};

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireRole("ADMIN");
  const { id } = await params;

  const result = await getCategory(actor, id);
  if (!result.ok || !result.data) {
    notFound();
  }

  const category = result.data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/categories"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Categories</span>
        </Link>
        <PageHeader
          title={`Edit ${category.name}`}
          description="Update category rules, booking limits and visual icon."
        />
      </div>

      <CategoryEditForm category={category} />
    </div>
  );
}
