import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { rolesActorCanCreate } from "@/lib/permissions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { UserCreateForm } from "@/components/users/user-create-form";

export default async function NewUserPage() {
  const actor = await requireRole("MANAGER", "ADMIN");
  const allowedRoles = rolesActorCanCreate(actor);

  const [sites, sections, actorSite] = await Promise.all([
    actor.role === "ADMIN"
      ? db.site.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    db.section.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    actor.siteId
      ? db.site.findUnique({
          where: { id: actor.siteId },
          select: { name: true },
        })
      : null,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/users">
            <ArrowLeft className="size-4" />
            <span>Back to users</span>
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Add new user"
        description="Provision a new user account with temporary credentials."
      />

      <UserCreateForm
        actorRole={actor.role}
        actorSiteId={actor.siteId}
        actorSiteName={actorSite?.name}
        allowedRoles={allowedRoles}
        sites={sites}
        sections={sections}
      />
    </div>
  );
}
