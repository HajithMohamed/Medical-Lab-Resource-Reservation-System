import * as React from "react";
import Link from "next/link";
import { FlaskConical, CalendarPlus, Eye, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listResources, type ResourceFilterOptions } from "@/services/resources";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { formatMinutes } from "@/lib/format";
import { ResourceFilters } from "@/components/resources/resource-filters";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceCreateDialog } from "@/components/resources/resource-create-dialog";
import { ResourceEditDialog } from "@/components/resources/resource-edit-dialog";
import { PaginationControls } from "@/components/pagination-controls";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = {
  title: "Resources | BenchBook",
  description: "Every shared instrument, cabinet, room and van in the network.",
};

interface ResourcesPageProps {
  searchParams?: Promise<{
    search?: string;
    siteId?: string;
    categoryId?: string;
    sectionId?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const user = await requireUser();
  const resolvedParams = searchParams ? await searchParams : {};

  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.max(1, Number(resolvedParams.pageSize) || 8);

  const filters: ResourceFilterOptions = {
    search: resolvedParams.search,
    siteId: resolvedParams.siteId,
    categoryId: resolvedParams.categoryId,
    sectionId: resolvedParams.sectionId,
    status: resolvedParams.status,
    page,
    pageSize,
  };

  // Load filter dropdown options and resources in parallel
  const [sites, categories, sections, resourcesResult] = await Promise.all([
    db.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { id: true, name: true, maxBookingMinutes: true, iconKey: true },
      orderBy: { name: "asc" },
    }),
    db.section.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listResources(filters),
  ]);

  const resources = resourcesResult.ok ? resourcesResult.data : [];
  const totalCount = resourcesResult.ok ? (resourcesResult.totalCount ?? resources.length) : 0;
  const totalPages = resourcesResult.ok ? (resourcesResult.totalPages ?? 1) : 1;

  const canAddResource = user.role === "MANAGER" || user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resources"
        description="Every shared instrument, cabinet, room and van in the network."
        actions={
          canAddResource ? (
            <ResourceCreateDialog
              actorRole={user.role}
              actorSiteId={user.siteId}
              sites={sites}
              categories={categories}
              sections={sections}
            />
          ) : undefined
        }
      />

      <ResourceFilters
        sites={sites}
        categories={categories}
        sections={sections}
        currentFilters={filters}
      />

      {resources.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No resources match these filters."
          description="Try adjusting your search criteria or clear the filters to view all available resources."
          action={
            <Button asChild variant="outline">
              <Link href="/resources">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop & Tablet Table (md and above) */}
          <div className="hidden md:block rounded-xl border border-[#334155] bg-[#141c2b] overflow-hidden shadow-sm">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="bg-[#222a3a]/70 border-b border-[#334155] text-[11px] font-mono uppercase tracking-wider text-[#94a3b8]">
                  <TableHead className="w-[32%] py-2.5 px-3">Resource Details</TableHead>
                  <TableHead className="w-[20%] py-2.5 px-3">Site / Campus</TableHead>
                  <TableHead className="w-[17%] py-2.5 px-3">Owning Section</TableHead>
                  <TableHead className="w-[13%] py-2.5 px-3">Clinical Room</TableHead>
                  <TableHead className="w-[10%] py-2.5 px-3">Real-Time Status</TableHead>
                  <TableHead className="w-[8%] py-2.5 px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => {
                  const isRoom = resource.category.iconKey === "room";
                  const capacityText =
                    isRoom && resource.capacity ? `, ${resource.capacity} seats` : "";
                  const subtitle = `${resource.category.name} • Max slot: ${formatMinutes(resource.category.maxBookingMinutes)}${capacityText}`;
                  const canManage =
                    user.role === "ADMIN" ||
                    (user.role === "MANAGER" && user.siteId === resource.siteId);

                  const isOos = resource.status === "OUT_OF_SERVICE";

                  return (
                    <TableRow
                      key={resource.id}
                      className={
                        isOos
                          ? "group hover:bg-[#222a3a]/50 transition-colors duration-150 bg-rose-950/15"
                          : "group hover:bg-[#222a3a]/50 transition-colors duration-150"
                      }
                    >
                      <TableCell className="py-2 px-3 overflow-hidden">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-md bg-[#18202f] border border-[#334155] flex items-center justify-center text-[#6cd8cb] shrink-0">
                            <CategoryIcon
                              iconKey={resource.category.iconKey}
                              className="size-4 shrink-0"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/resources/${resource.id}`}
                              className="font-semibold text-white group-hover:text-[#6cd8cb] transition-colors truncate block text-xs"
                              title={resource.name}
                            >
                              {resource.name}
                            </Link>
                            <span
                              className="text-[10px] font-mono text-[#94a3b8] block truncate"
                              title={subtitle}
                            >
                              {subtitle}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-3 overflow-hidden">
                        <span
                          className="font-medium text-white text-xs truncate block"
                          title={resource.site.name}
                        >
                          {resource.site.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-3 overflow-hidden">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#18202f] text-[#bcc9c6] border border-[#334155]/60 truncate inline-block max-w-full"
                          title={resource.section.name}
                        >
                          {resource.section.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 px-3 overflow-hidden text-[11px] font-mono">
                        {resource.location ? (
                          <span className="text-white truncate block" title={resource.location}>
                            {resource.location}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 px-3 overflow-hidden">
                        <ResourceStatusTag
                          status={resource.status}
                          className="text-[10px] px-2 py-0.5"
                        />
                      </TableCell>
                      <TableCell className="py-2 px-3 text-right overflow-hidden">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {resource.status === "ACTIVE" ? (
                            <Button
                              asChild
                              size="icon"
                              className="size-7 rounded bg-[#6cd8cb]/15 hover:bg-[#6cd8cb] text-[#6cd8cb] hover:text-[#003732] border border-[#6cd8cb]/40 transition-all active:scale-95 shadow-2xs"
                              title="Book slot"
                              aria-label={`Book slot for ${resource.name}`}
                            >
                              <Link href={`/bookings/new?resourceId=${resource.id}`}>
                                <CalendarPlus className="size-3.5" />
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded text-[#94a3b8] hover:text-white hover:bg-[#222a3a] transition-all"
                              title="View details"
                              aria-label={`View details for ${resource.name}`}
                            >
                              <Link href={`/resources/${resource.id}`}>
                                <Eye className="size-3.5" />
                              </Link>
                            </Button>
                          )}
                          {canManage && (
                            <ResourceEditDialog
                              resource={resource}
                              actorRole={user.role}
                              actorSiteId={user.siteId}
                              sites={sites}
                              categories={categories}
                              sections={sections}
                              trigger={
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-7 rounded bg-[#18202f] hover:bg-[#222a3a] text-[#94a3b8] hover:text-[#6cd8cb] border border-[#334155] hover:border-[#6cd8cb]/40 transition-all active:scale-95 shadow-2xs"
                                  title="Edit resource"
                                  aria-label={`Edit ${resource.name}`}
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              }
                            />
                          )}
                        </div>
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
              basePath="/resources"
              queryParams={{
                search: resolvedParams.search,
                siteId: resolvedParams.siteId,
                categoryId: resolvedParams.categoryId,
                sectionId: resolvedParams.sectionId,
                status: resolvedParams.status,
              }}
              itemLabel="resources"
            />
          </div>

          {/* Mobile Stacked Cards (below md) */}
          <div className="md:hidden space-y-3">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                actorRole={user.role}
                actorSiteId={user.siteId}
                sites={sites}
                categories={categories}
                sections={sections}
              />
            ))}
            <div className="pt-2">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                basePath="/resources"
                queryParams={{
                  search: resolvedParams.search,
                  siteId: resolvedParams.siteId,
                  categoryId: resolvedParams.categoryId,
                  sectionId: resolvedParams.sectionId,
                  status: resolvedParams.status,
                }}
                itemLabel="resources"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
