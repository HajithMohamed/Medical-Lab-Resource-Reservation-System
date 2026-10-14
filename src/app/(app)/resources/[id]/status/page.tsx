import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { canChangeResourceStatus } from "@/lib/permissions";
import { countUpcomingBookings } from "@/services/resources";
import { PageHeader } from "@/components/page-header";
import { ResourceStatusForm } from "@/components/resources/resource-status-form";

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
    title: `Change status: ${resource.name} | BenchBook`,
  };
}

interface ResourceStatusPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResourceStatusPage({ params }: ResourceStatusPageProps) {
  const { id } = await params;
  const actor = await requireRole("MANAGER", "ADMIN");

  const resource = await db.resource.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      status: true,
      siteId: true,
      site: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!resource) {
    notFound();
  }

  if (!canChangeResourceStatus(actor, resource)) {
    redirect("/no-access");
  }

  const upcomingBookingsCount = await countUpcomingBookings(id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/resources/${resource.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-4" />
          <span>Back to {resource.name}</span>
        </Link>
        <PageHeader
          title={`Change status: ${resource.name}`}
          description="Mark resource as active, out of service, or retired."
        />
      </div>

      <ResourceStatusForm resource={resource} upcomingBookingsCount={upcomingBookingsCount} />
    </div>
  );
}
