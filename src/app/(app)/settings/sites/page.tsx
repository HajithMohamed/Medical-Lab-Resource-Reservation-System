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
          className="inline-flex items-center gap-1 text-xs font-mono text-[#94a3b8] hover:text-[#6cd8cb] mb-3 transition-colors"
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
        <div className="rounded-lg border border-[#334155] bg-[#141c2b] overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#222a3a]/70 border-b border-[#334155] text-xs font-mono uppercase tracking-wider text-[#94a3b8]">
                <TableHead>Site Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Resources</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="w-28 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id} className="group hover:bg-[#222a3a]/50 transition-colors duration-150">
                  <TableCell className="font-semibold text-white py-3.5 px-4 text-sm">
                    <EditSiteDialog
                      site={site}
                      trigger={
                        <button
                          type="button"
                          className="font-semibold text-white hover:text-[#6cd8cb] transition-colors text-left cursor-pointer"
                        >
                          {site.name}
                        </button>
                      }
                    />
                  </TableCell>
                  <TableCell className="text-[#94a3b8] font-mono text-xs py-3.5 px-4">
                    {site.address || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-white font-mono text-xs py-3.5 px-4">
                    {site._count.resources}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-white font-mono text-xs py-3.5 px-4">
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
