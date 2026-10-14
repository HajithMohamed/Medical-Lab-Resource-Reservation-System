import * as React from "react";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
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
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-[320px]">Resource</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Owning section</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => {
                  const isRoom = resource.category.iconKey === "room";
                  const capacityText =
                    isRoom && resource.capacity ? `, ${resource.capacity} seats` : "";
                  const subtitle = `${resource.category.name}, up to ${formatMinutes(resource.category.maxBookingMinutes)}${capacityText}`;
                  const canManage =
                    user.role === "ADMIN" ||
                    (user.role === "MANAGER" && user.siteId === resource.siteId);

                  return (
                    <TableRow
                      key={resource.id}
                      className={
                        resource.status === "OUT_OF_SERVICE"
                          ? "bg-destructive/5 hover:bg-destructive/10 transition-colors"
                          : "hover:bg-muted/20 transition-colors"
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CategoryIcon
                            iconKey={resource.category.iconKey}
                            className="size-8 rounded-lg shrink-0"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/resources/${resource.id}`}
                              className="font-bold text-sm text-foreground hover:underline truncate block"
                            >
                              {resource.name}
                            </Link>
                            <span className="text-xs text-muted-foreground block truncate">
                              {subtitle}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {resource.site.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {resource.section.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {resource.location ? (
                          <span className="text-foreground">{resource.location}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ResourceStatusTag status={resource.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {resource.status === "ACTIVE" ? (
                            <Button asChild size="sm" className="h-8 px-3 font-semibold text-xs">
                              <Link href={`/bookings/new?resourceId=${resource.id}`}>Book</Link>
                            </Button>
                          ) : (
                            <Button
                              asChild
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Link href={`/resources/${resource.id}`}>View</Link>
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
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="border-t border-border bg-muted/20 px-3">
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
