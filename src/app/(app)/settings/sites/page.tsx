import * as React from "react";
import Link from "next/link";
import { Building2, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listSites } from "@/services/settings";
import { deleteSiteAction } from "@/actions/settings";
import { PageHeader } from "@/components/page-header";
import { SiteDialog } from "@/components/settings/site-dialog";
import { EditSiteDialog } from "@/components/settings/edit-site-dialog";
import { DeleteRowButton } from "@/components/settings/delete-row-button";
import { EmptyState } from "@/components/empty-state";
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
  title: "Sites | Settings",
};

interface SitesPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}

export default async function SitesPage({ searchParams }: SitesPageProps) {
  const actor = await requireRole("ADMIN");
  const resolvedParams = searchParams ? await searchParams : {};

  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.max(1, Number(resolvedParams.pageSize) || 8);

  const result = await listSites(actor, { page, pageSize });
  const sites = result.ok ? result.data : [];
  const totalCount = result.ok ? (result.totalCount ?? sites.length) : 0;
  const totalPages = result.ok ? (result.totalPages ?? 1) : 1;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-teal mb-3 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Settings</span>
        </Link>
        <PageHeader
          title="Sites"
          description="Manage laboratory branches and locations across the network."
          actions={<SiteDialog />}
        />
      </div>

      {sites.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No sites found"
          description="Add the first laboratory site to start organizing equipment and personnel."
          action={<SiteDialog />}
        />
      ) : (
        <div className="rounded-2xl border border-card-edge bg-card overflow-hidden shadow-v4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-canvas/80 border-b border-card-edge text-xs uppercase tracking-wider text-muted font-bold">
                  <TableHead>Site Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Resources</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="w-28 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow
                    key={site.id}
                    className="group hover:bg-mint/40 transition-colors duration-150 border-b border-card-edge"
                  >
                    <TableCell className="font-semibold text-navy py-3.5 px-4 text-sm">
                      <EditSiteDialog
                        site={site}
                        trigger={
                          <button
                            type="button"
                            className="font-semibold text-navy hover:text-teal transition-colors text-left cursor-pointer"
                          >
                            {site.name}
                          </button>
                        }
                      />
                    </TableCell>
                    <TableCell className="text-muted text-xs py-3.5 px-4">
                      {site.address || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-navy font-semibold text-xs py-3.5 px-4">
                      {site._count.resources}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-navy font-semibold text-xs py-3.5 px-4">
                      {site._count.users}
                    </TableCell>
                    <TableCell className="text-right py-3.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <EditSiteDialog site={site} />
                        <DeleteRowButton
                          id={site.id}
                          name={site.name}
                          entityType="site"
                          deleteAction={deleteSiteAction}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath="/settings/sites"
            itemLabel="sites"
          />
        </div>
      )}
    </div>
  );
}
