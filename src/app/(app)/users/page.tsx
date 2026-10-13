import * as React from "react";
import Link from "next/link";
import { UserPlus, Users as UsersIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listUsers, getUpcomingBookingsCountMap } from "@/services/users";
import { PageHeader } from "@/components/page-header";
import { FilterBar } from "@/components/filter-bar";
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
import { formatLabDate, formatLabTime, formatRelative } from "@/lib/time";
import { Role } from "@/generated/prisma/client";

interface UsersPageProps {
  searchParams: Promise<{
    siteId?: string;
    role?: string;
    status?: string;
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

  const validRoles = [Role.STAFF, Role.MANAGER, Role.ADMIN];
  const roleFilter = validRoles.find((r) => r === params.role);

  const validStatuses = ["ACTIVE", "LOCKED", "MUST_CHANGE_PASSWORD", "INACTIVE"] as const;
  const statusFilter = validStatuses.find((s) => s === params.status);

  const result = await listUsers(actor, {
    siteId: params.siteId || undefined,
    role: roleFilter,
    status: statusFilter,
  });

  const users = result.ok ? result.data : [];

  const sites = isAdmin
    ? await db.site.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  const now = new Date();
  const upcomingCountsMap = await getUpcomingBookingsCountMap(users.map((u) => u.id));

  const hasActiveFilters = Boolean(params.siteId || params.role || params.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={isAdmin ? "Everyone in the network" : "People who can sign in at your site"}
        actions={
          <Button asChild className="gap-2">
            <Link href="/users/new">
              <UserPlus className="size-4" />
              <span>Add user</span>
            </Link>
          </Button>
        }
      />

      {isAdmin && (
        <FilterBar action="/users" hasActiveFilters={hasActiveFilters} clearHref="/users">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label
              htmlFor="filter-site"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Site
            </label>
            <select
              id="filter-site"
              name="siteId"
              defaultValue={params.siteId ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label
              htmlFor="filter-role"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Role
            </label>
            <select
              id="filter-role"
              name="role"
              defaultValue={params.role ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All roles</option>
              <option value={Role.STAFF}>Staff</option>
              <option value={Role.MANAGER}>Site Manager</option>
              <option value={Role.ADMIN}>Administrator</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <label
              htmlFor="filter-status"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Status
            </label>
            <select
              id="filter-status"
              name="status"
              defaultValue={params.status ?? ""}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="MUST_CHANGE_PASSWORD">Must change password</option>
              <option value="LOCKED">Locked</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </FilterBar>
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
              <Button asChild className="gap-2">
                <Link href="/users/new">
                  <UserPlus className="size-4" />
                  <span>Add user</span>
                </Link>
              </Button>
            )
          }
        />
      ) : (
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
                <TableHead className="w-[50px] text-right">Actions</TableHead>
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
                          <div className="font-medium text-foreground truncate">
                            <Link
                              href={`/users/${user.id}`}
                              className="hover:underline focus-visible:underline"
                            >
                              {user.name}
                            </Link>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
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
                        isSelf={user.id === actor.id}
                        upcomingBookingsCount={upcomingCount}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
