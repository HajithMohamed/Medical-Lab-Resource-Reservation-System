import * as React from "react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ModalDialog } from "@/components/modal-dialog";
import { ResourceForm } from "@/components/resources/resource-form";

export default async function InterceptedNewResourcePage() {
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
    <ModalDialog
      title="Add resource"
      description="Register shared laboratory equipment, cabinets, rooms or vehicles."
      maxWidth="3xl"
    >
      <ResourceForm
        actorRole={actor.role}
        actorSiteId={actor.siteId}
        sites={sites}
        categories={categories}
        sections={sections}
      />
    </ModalDialog>
  );
}
