import * as React from "react";
import Link from "next/link";
import { Building2, ChevronRight, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listSites } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { SiteDialog } from "@/components/settings/site-dialog";
import { EmptyState } from "@/components/empty-state";
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

export default async function SitesPage() {
  const actor = await requireRole("ADMIN");
  const result = await listSites(actor);
  const sites = result.ok ? result.data : [];

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
                <TableHead className="w-12 text-right sr-only">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sites.map((site) => (
                <TableRow key={site.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground py-3.5">
                    <Link
                      href={`/settings/sites/${site.id}`}
                      className="block focus-visible:outline-none focus-visible:underline"
                    >
                      {site.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/sites/${site.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {site.address || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/sites/${site.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {site._count.resources}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/sites/${site.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {site._count.users}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <Link
                      href={`/settings/sites/${site.id}`}
                      className="inline-flex items-center text-muted-foreground group-hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                      <span className="sr-only">Edit {site.name}</span>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
