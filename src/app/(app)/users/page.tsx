import * as React from "react";
import Link from "next/link";
import { Users as UsersIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { rolesActorCanCreate } from "@/lib/permissions";
import { listUsers, getUpcomingBookingsCountMap } from "@/services/users";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserStatusPill } from "@/components/users/user-status-pill";
import { UserRowActions } from "@/components/users/user-row-actions";
import { UserFilterBar } from "@/components/users/user-filter-bar";
import { UserCreateDialog } from "@/components/users/user-create-dialog";
import { UserEditDialog } from "@/components/users/user-edit-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import { formatLabDate, formatLabTime, formatRelative } from "@/lib/time";
import { Role } from "@/generated/prisma/client";

interface UsersPageProps {
  searchParams: Promise<{
    siteId?: string;
    role?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const actor = await requireRole("MANAGER", "ADMIN");
  const params = await searchParams;

  const isAdmin = actor.role === Role.ADMIN;
  const allowedRoles = rolesActorCanCreate(actor);

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);

  const validRoles = [Role.STAFF, Role.MANAGER, Role.ADMIN];
  const roleFilter = validRoles.find((r) => r === params.role);

  const validStatuses = ["ACTIVE", "LOCKED", "MUST_CHANGE_PASSWORD", "INACTIVE"] as const;
  const statusFilter = validStatuses.find((s) => s === params.status);

  const [result, sites, sections, actorSite] = await Promise.all([
    listUsers(actor, {
      siteId: params.siteId || undefined,
      role: roleFilter,
      status: statusFilter,
      page,
      pageSize,
    }),
    isAdmin
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

  const users = result.ok ? result.data : [];
  const totalCount = result.ok ? (result.totalCount ?? users.length) : 0;
  const totalPages = result.ok ? (result.totalPages ?? 1) : 1;

  const now = new Date();
  const upcomingCountsMap = await getUpcomingBookingsCountMap(users.map((u) => u.id));

  const hasActiveFilters = Boolean(params.siteId || params.role || params.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={isAdmin ? "Everyone in the network" : "People who can sign in at your site"}
        actions={
          <UserCreateDialog
            actorRole={actor.role}
            actorSiteId={actor.siteId}
            actorSiteName={actorSite?.name}
            allowedRoles={allowedRoles}
            sites={sites}
            sections={sections}
          />
        }
      />

      {isAdmin && (
        <UserFilterBar
          sites={sites}
          currentSiteId={params.siteId}
          currentRole={params.role}
          currentStatus={params.status}
        />
      )}

      {users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={hasActiveFilters ? "No users match these filters." : "No users found"}
          description={
            hasActiveFilters
              ? "Try adjusting your filters to find what you are looking for."
              : "No user accounts have been added yet."
          }
          action={
            hasActiveFilters ? (
              <Button asChild variant="outline">
                <Link href="/users">Clear filters</Link>
              </Button>
            ) : (
              <UserCreateDialog
                actorRole={actor.role}
                actorSiteId={actor.siteId}
                actorSiteName={actorSite?.name}
                allowedRoles={allowedRoles}
                sites={sites}
                sections={sections}
              />
            )
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30%]">Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="w-[90px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const upcomingCount = upcomingCountsMap.get(user.id) ?? 0;
                  const lastLoginTitle = user.lastLoginAt
                    ? `${formatLabDate(user.lastLoginAt)} ${formatLabTime(user.lastLoginAt)}`
                    : "Never signed in";

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 bg-secondary text-secondary-foreground font-semibold text-xs shrink-0">
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <UserEditDialog
                              user={user}
                              actorId={actor.id}
                              actorRole={actor.role}
                              upcomingBookingsCount={upcomingCount}
                              sites={sites}
                              sections={sections}
                              trigger={
                                <button
                                  type="button"
                                  className="font-medium text-foreground text-left truncate hover:underline focus-visible:underline cursor-pointer block"
                                >
                                  {user.name}
                                </button>
                              }
                            />
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm font-medium">
                          {user.role === Role.STAFF
                            ? "Staff"
                            : user.role === Role.MANAGER
                              ? "Site Manager"
                              : "Administrator"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user.site?.name ?? "Network wide"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {user.section?.name ?? "—"}
                        </span>
                      </TableCell>

                      <TableCell>
                        <UserStatusPill user={user} />
                      </TableCell>

                      <TableCell>
                        <span
                          className="text-sm text-muted-foreground cursor-default"
                          title={lastLoginTitle}
                        >
                          {formatRelative(user.lastLoginAt, now)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <UserRowActions
                          user={user}
                          actorId={actor.id}
                          actorRole={actor.role}
                          upcomingBookingsCount={upcomingCount}
                          sites={sites}
                          sections={sections}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath="/users"
            queryParams={{
              siteId: params.siteId,
              role: params.role,
              status: params.status,
            }}
          />
        </div>
      )}
    </div>
  );
}
