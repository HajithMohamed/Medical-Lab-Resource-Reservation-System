import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageSite } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { ResourceForm } from "@/components/resources/resource-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await db.resource.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!resource) {
    return { title: "Resource not found | BenchBook" };
  }
  return {
    title: `Edit ${resource.name} | BenchBook`,
  };
}

interface EditResourcePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditResourcePage({ params }: EditResourcePageProps) {
  const { id } = await params;
  const actor = await requireRole("MANAGER", "ADMIN");

  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      siteId: true,
      categoryId: true,
      sectionId: true,
      location: true,
      capacity: true,
      status: true,
      manufacturer: true,
      model: true,
      serialNumber: true,
      inServiceOn: true,
      expectedServiceLifeYears: true,
      replacementReviewDueOn: true,
      calibrationIntervalDays: true,
      nextCalibrationDueOn: true,
      maintenanceIntervalDays: true,
      nextMaintenanceDueOn: true,
    },
  });

  if (!resource) {
    notFound();
  }

  if (!canManageSite(actor, resource.siteId)) {
    redirect("/no-access");
  }

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
          href={`/resources/${resource.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal hover:underline mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to {resource.name}</span>
        </Link>
        <PageHeader
          eyebrow="Resources / Edit"
          title={`Edit ${resource.name}`}
          description="Update equipment specifications, location or assigned department."
        />
      </div>

      <ResourceForm
        initialData={resource}
        actorRole={actor.role}
        actorSiteId={actor.siteId}
        sites={sites}
        categories={categories}
        sections={sections}
        isEdit
      />
    </div>
  );
}
