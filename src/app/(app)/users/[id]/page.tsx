import * as React from "react";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUser, getUpcomingBookingsCount } from "@/services/users";
import { UserEditForm } from "@/components/users/user-edit-form";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const actor = await requireRole("MANAGER", "ADMIN");
  const { id } = await params;

  const [userResult, bookingsCountResult] = await Promise.all([
    getUser(actor, id),
    getUpcomingBookingsCount(actor, id),
  ]);

  if (!userResult.ok || !userResult.data) {
    notFound();
  }

  const user = userResult.data;
  const upcomingCount = bookingsCountResult.ok ? bookingsCountResult.data : 0;

  const [sites, sections] = await Promise.all([
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
  ]);

  return (
    <div className="space-y-6">
      <UserEditForm
        user={user}
        actorId={actor.id}
        actorRole={actor.role}
        upcomingBookingsCount={upcomingCount}
        sites={sites}
        sections={sections}
      />
    </div>
  );
}
