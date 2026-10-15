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
    <div className="space-y-6 w-full">
      <PageHeader
        eyebrow="Access & Permissions"
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
              <Button
                asChild
                variant="outline"
                className="rounded-xl border-card-edge bg-card text-navy font-bold"
              >
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
        <div className="space-y-4">
          {/* Desktop & Tablet Table (md and above) */}
          <div className="hidden md:block rounded-[20px] border border-card-edge bg-card shadow-v4 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-canvas/80 border-b border-line text-xs font-black uppercase tracking-wider text-navy/90">
                  <TableHead className="w-[30%] py-3.5 px-4">Person</TableHead>
                  <TableHead className="py-3.5 px-4">Role</TableHead>
                  <TableHead className="py-3.5 px-4">Site</TableHead>
                  <TableHead className="py-3.5 px-4">Section</TableHead>
                  <TableHead className="py-3.5 px-4">Status</TableHead>
                  <TableHead className="py-3.5 px-4">Last sign-in</TableHead>
                  <TableHead className="w-[90px] text-right py-3.5 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-line">
                {users.map((u) => {
                  const upcomingCount = upcomingCountsMap.get(u.id) ?? 0;
                  const lastLoginTitle = u.lastLoginAt
                    ? `${formatLabDate(u.lastLoginAt)} ${formatLabTime(u.lastLoginAt)}`
                    : "Never signed in";

                  return (
                    <TableRow
                      key={u.id}
                      className="group hover:bg-mint/40 transition-colors duration-150"
                    >
                      <TableCell className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 rounded-xl bg-teal-soft text-teal font-extrabold text-xs shrink-0">
                            <AvatarFallback className="bg-teal-soft text-teal">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <UserEditDialog
                              user={u}
                              actorId={actor.id}
                              actorRole={actor.role}
                              upcomingBookingsCount={upcomingCount}
                              sites={sites}
                              sections={sections}
                              trigger={
                                <button
                                  type="button"
                                  className="font-bold text-navy text-left truncate hover:text-teal transition-colors cursor-pointer block text-sm"
                                >
                                  {u.name}
                                </button>
                              }
                            />
                            <div className="text-xs text-muted truncate">{u.email}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <span className="text-xs font-bold text-navy">
                          {u.role === Role.STAFF
                            ? "Staff"
                            : u.role === Role.MANAGER
                              ? "Site Manager"
                              : "Administrator"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <span className="text-xs font-medium text-navy">
                          {u.site?.name ?? "Network wide"}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        {u.section?.name ? (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-canvas text-navy border border-card-edge">
                            {u.section.name}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <UserStatusPill user={u} />
                      </TableCell>

                      <TableCell className="py-3 px-4">
                        <span className="text-xs text-muted cursor-default" title={lastLoginTitle}>
                          {formatRelative(u.lastLoginAt, now)}
                        </span>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-right">
                        <UserRowActions
                          user={u}
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

          {/* Mobile Phone Cards (< md) */}
          <div className="md:hidden space-y-3">
            {users.map((u) => {
              const upcomingCount = upcomingCountsMap.get(u.id) ?? 0;
              return (
                <div
                  key={u.id}
                  className="rounded-2xl border border-card-edge bg-card p-4 space-y-3 shadow-v4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Avatar className="size-10 rounded-xl bg-teal-soft text-teal font-extrabold text-xs shrink-0">
                        <AvatarFallback className="bg-teal-soft text-teal">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <UserEditDialog
                          user={u}
                          actorId={actor.id}
                          actorRole={actor.role}
                          upcomingBookingsCount={upcomingCount}
                          sites={sites}
                          sections={sections}
                          trigger={
                            <button
                              type="button"
                              className="font-bold text-navy text-left truncate hover:text-teal transition-colors cursor-pointer block text-sm"
                            >
                              {u.name}
                            </button>
                          }
                        />
                        <div className="text-xs text-muted truncate mt-0.5">{u.email}</div>
                      </div>
                    </div>
                    <UserStatusPill user={u} className="shrink-0" />
                  </div>

                  <div className="pt-2 border-t border-line grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted block text-[11px] font-semibold">Role</span>
                      <span className="font-bold text-navy">
                        {u.role === Role.STAFF
                          ? "Staff"
                          : u.role === Role.MANAGER
                            ? "Site Manager"
                            : "Administrator"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted block text-[11px] font-semibold">Site</span>
                      <span className="font-bold text-navy truncate block">
                        {u.site?.name ?? "Network wide"}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      {u.lastLoginAt
                        ? `Active ${formatRelative(u.lastLoginAt, now)}`
                        : "Never signed in"}
                    </span>
                    <UserRowActions
                      user={u}
                      actorId={actor.id}
                      actorRole={actor.role}
                      upcomingBookingsCount={upcomingCount}
                      sites={sites}
                      sections={sections}
                    />
                  </div>
                </div>
              );
            })}
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
