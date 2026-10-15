import * as React from "react";
import Link from "next/link";
import { FlaskConical, CalendarPlus, Eye, Pencil, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listResources, type ResourceFilterOptions } from "@/services/resources";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { CategoryIcon } from "@/components/category-icon";
import { ResourceStatusTag } from "@/components/resource-status-tag";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { canBook } from "@/lib/permissions";
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
        eyebrow="Resources inventory"
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
              trigger={
                <Button
                  type="button"
                  className="h-10 px-4 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  <span>Add resource</span>
                </Button>
              }
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
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-card-edge bg-card text-navy font-bold"
            >
              <Link href="/resources">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop & Tablet Table (md and above) */}
          <div className="hidden md:block rounded-2xl border border-card-edge bg-card overflow-hidden shadow-v4">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow className="bg-canvas border-b border-line text-[11px] font-extrabold uppercase tracking-wider text-muted">
                  <TableHead className="w-[30%] py-3 px-4">Resource</TableHead>
                  <TableHead className="w-[16%] py-3 px-4">Category</TableHead>
                  <TableHead className="w-[20%] py-3 px-4">Site</TableHead>
                  <TableHead className="w-[12%] py-3 px-4">Status</TableHead>
                  <TableHead className="w-[12%] py-3 px-4">Calibration</TableHead>
                  <TableHead className="w-[10%] py-3 px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-line">
                {resources.map((resource) => {
                  const canManage =
                    user.role === "ADMIN" ||
                    (user.role === "MANAGER" && user.siteId === resource.siteId);

                  const isOos = resource.status === "OUT_OF_SERVICE";

                  return (
                    <TableRow
                      key={resource.id}
                      className={
                        isOos
                          ? "group hover:bg-mint/40 transition-colors bg-red-soft/20"
                          : "group hover:bg-mint/40 transition-colors"
                      }
                    >
                      {/* Resource: Icon + Name + Section */}
                      <TableCell className="py-3 px-4 overflow-hidden">
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon iconKey={resource.category.iconKey} />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/resources/${resource.id}`}
                              className="font-bold text-navy group-hover:text-teal transition-colors truncate block text-sm"
                              title={resource.name}
                            >
                              {resource.name}
                            </Link>
                            <span
                              className="text-xs text-muted block truncate mt-0.5"
                              title={resource.section.name}
                            >
                              {resource.section.name}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="py-3 px-4 overflow-hidden">
                        <span
                          className="font-medium text-navy text-xs truncate block"
                          title={resource.category.name}
                        >
                          {resource.category.name}
                        </span>
                      </TableCell>

                      {/* Site */}
                      <TableCell className="py-3 px-4 overflow-hidden">
                        <span
                          className="font-medium text-navy text-xs truncate block"
                          title={resource.site.name}
                        >
                          {resource.site.name}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3 px-4 overflow-hidden">
                        <ResourceStatusTag status={resource.status} />
                      </TableCell>

                      {/* Calibration */}
                      <TableCell className="py-3 px-4 overflow-hidden">
                        {resource.calibrationStatus === "FAILED" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-red-soft text-red border border-red/20">
                            Check failed
                          </span>
                        ) : resource.calibrationStatus === "OVERDUE" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-soft text-amber border border-amber-line">
                            Overdue
                          </span>
                        ) : resource.nextCalibrationDueOn ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-soft text-amber-strong border border-amber-line">
                            Due soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-teal-soft text-teal-deep border border-teal-line">
                            Current
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 px-4 text-right overflow-hidden">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {canBook(user) && resource.status === "ACTIVE" && (
                            <Button
                              asChild
                              size="sm"
                              className="h-8 px-2.5 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95"
                              title="Book slot"
                              aria-label={`Book slot for ${resource.name}`}
                            >
                              <Link
                                href={`/book?resourceId=${resource.id}`}
                                className="flex items-center gap-1"
                              >
                                <CalendarPlus className="size-3.5" />
                                <span>Book</span>
                              </Link>
                            </Button>
                          )}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 rounded-xl border border-card-edge bg-card hover:bg-canvas text-navy font-bold text-xs"
                            title="View details"
                            aria-label={`View details for ${resource.name}`}
                          >
                            <Link
                              href={`/resources/${resource.id}`}
                              className="flex items-center gap-1"
                            >
                              <Eye className="size-3.5" />
                              <span>View</span>
                            </Link>
                          </Button>
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
                                  size="sm"
                                  className="h-8 px-2 rounded-xl border border-card-edge bg-card hover:bg-canvas text-navy font-bold text-xs"
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
