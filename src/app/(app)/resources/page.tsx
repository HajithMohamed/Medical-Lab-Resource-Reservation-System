import * as React from "react";
import Link from "next/link";
import { Plus, FlaskConical } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { SummaryStrip } from "@/components/summary-strip";

export const metadata = {
  title: "Resource Registry | BenchBook Pro",
  description:
    "Precision Clinical Operations — Registry of shared instruments, cabinets, and rooms.",
};

interface ResourcesPageProps {
  searchParams?: Promise<{
    search?: string;
    siteId?: string;
    categoryId?: string;
    sectionId?: string;
    status?: string;
  }>;
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const user = await requireUser();
  const resolvedParams = searchParams ? await searchParams : {};

  const filters: ResourceFilterOptions = {
    search: resolvedParams.search,
    siteId: resolvedParams.siteId,
    categoryId: resolvedParams.categoryId,
    sectionId: resolvedParams.sectionId,
    status: resolvedParams.status,
  };

  // Load filter dropdown options and resources in parallel
  const [sites, categories, sections, resourcesResult] = await Promise.all([
    db.site.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.section.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listResources(filters),
  ]);

  const resources = resourcesResult.ok ? resourcesResult.data : [];
  const canAddResource = user.role === "MANAGER" || user.role === "ADMIN";

  const totalUnits = resources.length;
  const activeUnits = resources.filter((r) => r.status === "ACTIVE").length;
  const lockoutUnits = resources.filter((r) => r.status === "OUT_OF_SERVICE").length;
  const operationalPct = totalUnits > 0 ? Math.round((activeUnits / totalUnits) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Resource Registry"
        description="Core diagnostic instruments, biosafety units, and clinical laboratory suites."
        actions={
          canAddResource ? (
            <Button
              asChild
              size="sm"
              className="h-9 px-3 gap-1.5 bg-primary text-primary-foreground font-semibold text-xs hover:brightness-110 shadow-xs"
            >
              <Link href="/resources/new">
                <Plus className="size-4 stroke-[2.5]" />
                <span>Add Instrument</span>
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* 4-Column Operational Summary Metrics Strip */}
      <SummaryStrip
        items={[
          {
            label: "Operational Instruments",
            value: `${activeUnits} / ${totalUnits}`,
            hint: `${operationalPct}% Operational • ${activeUnits} Ready`,
            dotColor: "primary",
          },
          {
            label: "Registry Total",
            value: `${totalUnits} Units`,
            hint: "Precision diagnostic grid",
            dotColor: "secondary",
          },
          {
            label: "Operational Health",
            value: lockoutUnits === 0 ? "Optimal" : "Degraded",
            hint: lockoutUnits === 0 ? "All certified online" : `${lockoutUnits} pending repair`,
            dotColor: lockoutUnits === 0 ? "primary" : "tertiary",
          },
          {
            label: "Fault Lockout",
            value: `${lockoutUnits} ${lockoutUnits === 1 ? "Unit" : "Units"}`,
            hint: lockoutUnits > 0 ? "Safety lockout active" : "Zero lockout incidents",
            dotColor: lockoutUnits > 0 ? "error" : "primary",
          },
        ]}
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
          <div className="hidden md:block rounded-lg border border-outline-variant bg-surface-container overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-outline-variant bg-surface-container-lowest hover:bg-surface-container-lowest">
                  <TableHead className="w-[320px] font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Instrument / Resource
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Site
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Owning section
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Location
                  </TableHead>
                  <TableHead className="font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-outline-variant/40">
                {resources.map((resource) => {
                  const isRoom = resource.category.iconKey === "room";
                  const capacityText =
                    isRoom && resource.capacity ? `, ${resource.capacity} seats` : "";
                  const subtitle = `${resource.category.name}, up to ${formatMinutes(resource.category.maxBookingMinutes)}${capacityText}`;

                  return (
                    <TableRow
                      key={resource.id}
                      className="hover:bg-surface-container-high/60 border-outline-variant/40 transition-colors"
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
                              className="font-semibold text-xs text-on-surface hover:text-primary transition-colors truncate block"
                            >
                              {resource.name}
                            </Link>
                            <span className="font-mono text-[10.5px] text-on-surface-variant block truncate">
                              {subtitle}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-on-surface">
                        {resource.site.name}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-on-surface-variant">
                        {resource.section.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        {resource.location ? (
                          <span className="text-on-surface">{resource.location}</span>
                        ) : (
                          <span className="text-on-surface-variant/60 italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ResourceStatusTag status={resource.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {resource.status === "ACTIVE" ? (
                          <Button
                            asChild
                            size="sm"
                            className="h-7.5 px-3 bg-primary text-primary-foreground font-semibold text-xs hover:brightness-110 active:scale-[0.98] transition-all shadow-2xs"
                          >
                            <Link href={`/bookings/new?resourceId=${resource.id}`}>Reserve</Link>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7.5 px-3 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                          >
                            <Link href={`/resources/${resource.id}`}>View</Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Stacked Cards (below md) */}
          <div className="md:hidden space-y-3">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
