import * as React from "react";
import Link from "next/link";
import { Filter, RotateCcw } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { listBookingsForOversight, type OversightBookingFilters } from "@/services/bookings";
import { PageHeader } from "@/components/page-header";
import { BookingsOversightTable } from "@/components/bookings/bookings-oversight-table";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

      {/* Filter Toolbar (Plain GET form, bookmarkable & shareable) */}
      <form
        method="GET"
        action="/bookings/manage"
        className="p-4 rounded-xl border border-[#334155] bg-[#141c2b] shadow-xs space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* From Date */}
          <div className="space-y-1">
            <label htmlFor="filter-from" className="text-xs font-mono font-medium text-slate-300">
              From date
            </label>
            <div className="relative">
              <Input
                id="filter-from"
                type="date"
                name="from"
                defaultValue={oversightResult.query.from}
                className="bg-[#0b1322] border-[#334155] text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label htmlFor="filter-to" className="text-xs font-mono font-medium text-slate-300">
              To date
            </label>
            <div className="relative">
              <Input
                id="filter-to"
                type="date"
                name="to"
                defaultValue={oversightResult.query.to}
                className="bg-[#0b1322] border-[#334155] text-xs font-mono text-slate-100"
              />
            </div>
          </div>

          {/* Site Filter (Admin only) */}
          {actor.role === "ADMIN" && (
            <div className="space-y-1">
              <label htmlFor="filter-site" className="text-xs font-mono font-medium text-slate-300">
                Site
              </label>
              <select
                id="filter-site"
                name="siteId"
                defaultValue={siteId ?? "all"}
                className="w-full h-9 rounded-md border border-[#334155] bg-[#0b1322] px-3 py-1 text-xs font-mono text-slate-100 outline-none focus:ring-1 focus:ring-[#6cd8cb]"
              >
                <option value="all">All sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Resource Filter */}
          <div className="space-y-1">
            <label
              htmlFor="filter-resource"
              className="text-xs font-mono font-medium text-slate-300"
            >
              Resource
            </label>
            <select
              id="filter-resource"
              name="resourceId"
              defaultValue={resourceId ?? "all"}
              className="w-full h-9 rounded-md border border-[#334155] bg-[#0b1322] px-3 py-1 text-xs font-mono text-slate-100 outline-none focus:ring-1 focus:ring-[#6cd8cb]"
            >
              <option value="all">All resources</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Person Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-person" className="text-xs font-mono font-medium text-slate-300">
              Booked by
            </label>
            <div className="relative">
              <Input
                id="filter-person"
                type="text"
                name="person"
                placeholder="Name search..."
                defaultValue={person ?? ""}
                className="bg-[#0b1322] border-[#334155] text-xs text-slate-100"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-status" className="text-xs font-mono font-medium text-slate-300">
              Status
            </label>
            <select
              id="filter-status"
              name="status"
              defaultValue={status}
              className="w-full h-9 rounded-md border border-[#334155] bg-[#0b1322] px-3 py-1 text-xs font-mono text-slate-100 outline-none focus:ring-1 focus:ring-[#6cd8cb]"
            >
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ALL">All statuses</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#334155]/60">
          <span className="text-xs font-mono text-slate-400">
            Found <strong className="text-slate-100">{oversightResult.totalCount}</strong>{" "}
            {oversightResult.totalCount === 1 ? "booking" : "bookings"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              asChild
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-mono text-slate-400 hover:text-slate-200"
            >
              <Link href="/bookings/manage">
                <RotateCcw className="size-3.5 mr-1" />
                <span>Reset</span>
              </Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 gap-1.5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono active:scale-95 transition-all shadow-xs"
            >
              <Filter className="size-3.5" />
              <span>Apply filters</span>
            </Button>
          </div>
        </div>
      </form>

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
