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
        description={
          isAdmin
            ? "Manage staff, site managers and system administrators across all sites."
            : `Manage staff members at ${actorSite?.name ?? "your assigned site"}.`
        }
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
          <div className="rounded-lg border border-[#334155] bg-[#141c2b] shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#222a3a]/70 border-b border-[#334155] text-xs font-mono uppercase tracking-wider text-[#94a3b8]">
                  <TableHead className="w-[30%]">Person</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const upcomingCount = upcomingCountsMap.get(user.id) ?? 0;
                  const lastLoginTitle = user.lastLoginAt
                    ? `${formatLabDate(user.lastLoginAt)} ${formatLabTime(user.lastLoginAt)}`
                    : "Never signed in";

                  return (
                    <TableRow key={user.id} className="group hover:bg-[#222a3a]/50 transition-colors duration-150">
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 rounded-lg bg-[#6cd8cb]/20 text-[#6cd8cb] border border-[#6cd8cb]/30 font-mono font-bold text-xs shrink-0">
                            <AvatarFallback className="bg-[#6cd8cb]/20 text-[#6cd8cb]">{getInitials(user.name)}</AvatarFallback>
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
                                  className="font-semibold text-white text-left truncate hover:text-[#6cd8cb] transition-colors cursor-pointer block text-sm"
                                >
                                  {user.name}
                                </button>
                              }
                            />
                            <div className="text-xs font-mono text-[#94a3b8] truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <span className="text-sm font-medium text-white">
                          {user.role === Role.STAFF
                            ? "Staff"
                            : user.role === Role.MANAGER
                              ? "Site Manager"
                              : "Administrator"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <span className="text-sm text-[#dbe2f8]">
                          {user.site?.name ?? "Network wide"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        {user.section?.name ? (
                          <span className="px-2 py-0.5 rounded text-xs font-mono bg-[#18202f] text-[#bcc9c6] border border-[#334155]/60">
                            {user.section.name}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-xs font-mono">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <UserStatusPill user={user} />
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <span
                          className="text-xs font-mono text-[#94a3b8] cursor-default"
                          title={lastLoginTitle}
                        >
                          {formatRelative(user.lastLoginAt, now)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-right">
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
              itemLabel="users"
            />
          </div>
        </div>
      )}
    </div>
  );
}
