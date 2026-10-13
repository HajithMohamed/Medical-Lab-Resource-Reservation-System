import * as React from "react";
import Link from "next/link";
import { Layers, ChevronRight, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listSections } from "@/services/settings";
import { PageHeader } from "@/components/page-header";
import { SectionDialog } from "@/components/settings/section-dialog";
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
  title: "Sections | Settings",
};

export default async function SectionsPage() {
  const actor = await requireRole("ADMIN");
  const result = await listSections(actor);
  const sections = result.ok ? result.data : [];

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
          title="Sections"
          description="Manage laboratory departments and operational divisions."
          actions={<SectionDialog />}
        />
      </div>

      {sections.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No sections found"
          description="Add the first laboratory section to start organizing equipment and personnel."
          action={<SectionDialog />}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground text-right">
                  Resources
                </TableHead>
                <TableHead className="font-semibold text-foreground text-right">Users</TableHead>
                <TableHead className="w-12 text-right sr-only">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <TableRow key={section.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground py-3.5">
                    <Link
                      href={`/settings/sections/${section.id}`}
                      className="block focus-visible:outline-none focus-visible:underline"
                    >
                      {section.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/sections/${section.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {section._count.resources}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/sections/${section.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {section._count.users}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <Link
                      href={`/settings/sections/${section.id}`}
                      className="inline-flex items-center text-muted-foreground group-hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                      <span className="sr-only">Edit {section.name}</span>
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
