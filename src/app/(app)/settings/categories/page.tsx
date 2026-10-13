import * as React from "react";
import Link from "next/link";
import { Tag, ChevronRight, ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listCategories } from "@/services/settings";
import { formatMinutes } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { CategoryDialog } from "@/components/settings/category-dialog";
import { CategoryIcon } from "@/components/category-icon";
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
  title: "Categories | Settings",
};

export default async function CategoriesPage() {
  const actor = await requireRole("ADMIN");
  const result = await listCategories(actor);
  const categories = result.ok ? result.data : [];

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
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center sr-only">Icon</TableHead>
                <TableHead className="font-semibold text-foreground">Name</TableHead>
                <TableHead className="font-semibold text-foreground">Longest booking</TableHead>
                <TableHead className="font-semibold text-foreground text-right">
                  Resources
                </TableHead>
                <TableHead className="w-12 text-right sr-only">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="w-12 pl-4 pr-0 py-3.5">
                    <Link
                      href={`/settings/categories/${category.id}`}
                      className="block focus-visible:outline-none"
                    >
                      <CategoryIcon
                        iconKey={category.iconKey}
                        className="size-8 rounded-md"
                        iconClassName="size-4"
                      />
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium text-foreground py-3.5">
                    <Link
                      href={`/settings/categories/${category.id}`}
                      className="block focus-visible:outline-none focus-visible:underline"
                    >
                      {category.name}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/categories/${category.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {formatMinutes(category.maxBookingMinutes)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground py-3.5">
                    <Link
                      href={`/settings/categories/${category.id}`}
                      className="block focus-visible:outline-none"
                    >
                      {category._count.resources}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right py-3.5">
                    <Link
                      href={`/settings/categories/${category.id}`}
                      className="inline-flex items-center text-muted-foreground group-hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                      <span className="sr-only">Edit {category.name}</span>
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
