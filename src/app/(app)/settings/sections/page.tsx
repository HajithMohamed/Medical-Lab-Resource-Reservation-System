import * as React from "react";
import Link from "next/link";
import { Layers, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listSections } from "@/services/settings";
import { deleteSectionAction } from "@/actions/settings";
import { PageHeader } from "@/components/page-header";
import { SectionDialog } from "@/components/settings/section-dialog";
import { EditSectionDialog } from "@/components/settings/edit-section-dialog";
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
  title: "Sections | Settings",
};

interface SectionsPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}

export default async function SectionsPage({ searchParams }: SectionsPageProps) {
  const actor = await requireRole("ADMIN");
  const resolvedParams = searchParams ? await searchParams : {};

  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.max(1, Number(resolvedParams.pageSize) || 8);

  const result = await listSections(actor, { page, pageSize });
  const sections = result.ok ? result.data : [];
  const totalCount = result.ok ? (result.totalCount ?? sections.length) : 0;
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
        <div className="rounded-lg border border-[#334155] bg-[#141c2b] overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#222a3a]/70 border-b border-[#334155] text-xs font-mono uppercase tracking-wider text-[#94a3b8]">
                <TableHead>Section Name</TableHead>
                <TableHead className="text-right">Resources</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="w-28 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sections.map((section) => (
                <TableRow key={section.id} className="group hover:bg-[#222a3a]/50 transition-colors duration-150">
                  <TableCell className="font-semibold text-white py-3.5 px-4 text-sm">
                    <EditSectionDialog
                      section={section}
                      trigger={
                        <button
                          type="button"
                          className="font-semibold text-white hover:text-[#6cd8cb] transition-colors text-left cursor-pointer"
                        >
                          {section.name}
                        </button>
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-white font-mono text-xs py-3.5 px-4">
                    {section._count.resources}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-white font-mono text-xs py-3.5 px-4">
                    {section._count.users}
                  </TableCell>
                  <TableCell className="text-right py-3.5 pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <EditSectionDialog section={section} />
                      <DeleteRowButton
                        id={section.id}
                        name={section.name}
                        entityType="section"
                        deleteAction={deleteSectionAction}
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
            basePath="/settings/sections"
            itemLabel="sections"
          />
        </div>
      )}
    </div>
  );
}
