import * as React from "react";
import Link from "next/link";
import { Tag, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listCategories } from "@/services/settings";
import { deleteCategoryAction } from "@/actions/settings";
import { formatMinutes } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CategoryDialog } from "@/components/settings/category-dialog";
import { EditCategoryDialog } from "@/components/settings/edit-category-dialog";
import { DeleteRowButton } from "@/components/settings/delete-row-button";
import { CategoryIcon } from "@/components/category-icon";
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
  title: "Categories | Settings",
};

interface CategoriesPageProps {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
  }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const actor = await requireRole("ADMIN");
  const resolvedParams = searchParams ? await searchParams : {};

  const page = Math.max(1, Number(resolvedParams.page) || 1);
  const pageSize = Math.max(1, Number(resolvedParams.pageSize) || 8);

  const result = await listCategories(actor, { page, pageSize });
  const categories = result.ok ? result.data : [];
  const totalCount = result.ok ? (result.totalCount ?? categories.length) : 0;
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
          title="Categories"
          description="Manage equipment categories, booking duration limits and visual icons."
          actions={<CategoryDialog />}
        />
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories found"
          description="Add the first equipment category to define booking limits and icons."
          action={<CategoryDialog />}
        />
      ) : (
        <div className="rounded-2xl border border-card-edge bg-card overflow-hidden shadow-v4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-canvas/80 border-b border-card-edge text-xs uppercase tracking-wider text-muted font-bold">
                  <TableHead className="w-14 text-center">Glyph</TableHead>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Longest Booking</TableHead>
                  <TableHead className="text-right">Resources</TableHead>
                  <TableHead className="w-28 text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="group hover:bg-mint/40 transition-colors duration-150 border-b border-card-edge"
                  >
                    <TableCell className="w-14 pl-4 pr-0 py-3.5">
                      <div className="w-9 h-9 rounded-xl bg-teal-soft border border-teal/20 flex items-center justify-center text-teal-deep shrink-0">
                        <CategoryIcon iconKey={category.iconKey} className="size-5 shrink-0" />
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-navy py-3.5 px-4 text-sm">
                      <EditCategoryDialog
                        category={category}
                        trigger={
                          <button
                            type="button"
                            className="font-semibold text-navy hover:text-teal transition-colors text-left cursor-pointer"
                          >
                            {category.name}
                          </button>
                        }
                      />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted text-xs py-3.5 px-4">
                      {formatMinutes(category.maxBookingMinutes)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-navy font-semibold text-xs py-3.5 px-4">
                      {category._count.resources}
                    </TableCell>
                    <TableCell className="text-right py-3.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <EditCategoryDialog category={category} />
                        <DeleteRowButton
                          id={category.id}
                          name={category.name}
                          entityType="category"
                          deleteAction={deleteCategoryAction}
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
            basePath="/settings/categories"
            itemLabel="categories"
          />
        </div>
      )}
    </div>
  );
}
