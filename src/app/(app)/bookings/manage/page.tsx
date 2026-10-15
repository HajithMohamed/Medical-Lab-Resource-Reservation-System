import * as React from "react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listBookingsForOversight, type OversightBookingFilters } from "@/services/bookings";
import { PageHeader } from "@/components/page-header";
import { BookingsManageFilter } from "@/components/bookings/bookings-manage-filter";
import { BookingsOversightTable } from "@/components/bookings/bookings-oversight-table";
import { PaginationControls } from "@/components/pagination-controls";
import { BOOKINGS_PAGE_SIZE } from "@/config/rules";

export const metadata = {
  title: "Bookings Oversight | BenchBook",
  description: "Review, filter and manage laboratory bookings and cancellations across facilities.",
};

interface ManageBookingsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ManageBookingsPage({ searchParams }: ManageBookingsPageProps) {
  const actor = await requireRole("MANAGER", "ADMIN");
  const rawParams = searchParams ? await searchParams : {};

  const getParam = (key: string): string | undefined => {
    const val = rawParams[key];
    if (Array.isArray(val)) return val[0];
    return val;
  };

  const from = getParam("from");
  const to = getParam("to");
  const siteId = getParam("siteId");
  const resourceId = getParam("resourceId");
  const person = getParam("person");
  const statusParam = getParam("status");
  const pageParam = getParam("page");

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const status = statusParam === "CANCELLED" || statusParam === "ALL" ? statusParam : "CONFIRMED";

  const filters: OversightBookingFilters = {
    from,
    to,
    siteId,
    resourceId,
    person,
    status,
    page,
    pageSize: BOOKINGS_PAGE_SIZE,
  };

  // Load oversight items and options concurrently
  const [oversightResult, sites, resources] = await Promise.all([
    listBookingsForOversight(actor, filters),
    actor.role === "ADMIN"
      ? db.site.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [],
    db.resource.findMany({
      where: {
        status: { not: "RETIRED" },
        ...(actor.role === "MANAGER"
          ? { siteId: actor.siteId ?? "" }
          : siteId && siteId !== "all"
            ? { siteId }
            : {}),
      },
      select: { id: true, name: true, siteId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const queryParams: Record<string, string | undefined> = {
    from: oversightResult.query.from,
    to: oversightResult.query.to,
    status: oversightResult.query.status,
  };
  if (siteId && siteId !== "all") queryParams.siteId = siteId;
  if (resourceId && resourceId !== "all") queryParams.resourceId = resourceId;
  if (person && person.trim().length > 0) queryParams.person = person.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings oversight"
        description={
          actor.role === "ADMIN"
            ? "Network-wide schedule oversight: view bookings, audit cancellations, and release blocked equipment."
            : "Site schedule oversight: view bookings, audit cancellations, and manage facility allocation."
        }
      />

      {/* Filter Toolbar (AutoFilter without Apply button) */}
      <BookingsManageFilter
        from={oversightResult.query.from}
        to={oversightResult.query.to}
        siteId={siteId}
        resourceId={resourceId}
        person={person}
        status={status}
        totalCount={oversightResult.totalCount}
        showSiteFilter={actor.role === "ADMIN"}
        sites={sites}
        resources={resources}
      />

      {/* Bookings Table */}
      <BookingsOversightTable items={oversightResult.items} />

      {/* Pagination */}
      <PaginationControls
        currentPage={oversightResult.page}
        totalPages={oversightResult.totalPages}
        totalCount={oversightResult.totalCount}
        pageSize={oversightResult.pageSize}
        basePath="/bookings/manage"
        queryParams={queryParams}
        itemLabel="bookings"
      />
    </div>
  );
}
