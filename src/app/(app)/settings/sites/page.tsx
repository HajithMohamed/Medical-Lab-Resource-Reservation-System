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
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-3 transition-colors"
        >
          <ArrowLeft className="size-4" />
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
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Address</TableHead>
                <TableHead className="font-semibold text-foreground text-right">
                  Resources
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right">Users</TableHead>
                <TableHead className="w-28 text-right font-semibold text-foreground pr-4">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground py-3.5">
                    <EditSiteDialog
                      site={site}
                      trigger={
                        <button
                          type="button"
                          className="font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:underline text-left cursor-pointer"
                        >
                          {site.name}
                        </button>
                      }
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground py-3.5">
                    {site.address || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
                    {site._count.resources}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
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
          <div className="border-t border-border bg-muted/20 px-3">
            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              basePath="/settings/sites"
              itemLabel="sites"
            />
          </div>
        </div>
      )}
    </div>
  );
}
