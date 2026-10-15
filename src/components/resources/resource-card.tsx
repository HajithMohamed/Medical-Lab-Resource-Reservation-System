import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/category-icon";
import { StatusPill } from "@/components/resource-status-tag";
import type { ResourceListItem } from "@/services/resources";
import type { Role } from "@/generated/prisma/client";
import { ResourceEditDialog } from "@/components/resources/resource-edit-dialog";
import { CalendarPlus, Eye, Bell, Pencil } from "lucide-react";

interface ResourceCardProps {
  resource: ResourceListItem;
  actorRole?: Role;
  actorSiteId?: string | null;
  sites?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string; maxBookingMinutes: number; iconKey: string }>;
  sections?: Array<{ id: string; name: string }>;
}

export function ResourceCard({
  resource,
  actorRole,
  actorSiteId,
  sites,
  categories,
  sections,
}: ResourceCardProps) {
  const canManage =
    actorRole === "ADMIN" ||
    (actorRole === "MANAGER" && actorSiteId && actorSiteId === resource.siteId);
  const canBook =
    (actorRole === "STAFF" || actorRole === "MANAGER") && resource.status === "ACTIVE";
  const isOos = resource.status === "OUT_OF_SERVICE";

  return (
    <div className="rounded-2xl border border-card-edge bg-card p-4 space-y-3 shadow-v4 transition-shadow hover:shadow-md">
      {/* Top Header: Category Icon, Name, Section, Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <CategoryIcon iconKey={resource.category.iconKey} />
          <div className="min-w-0">
            <Link
              href={`/resources/${resource.id}`}
              className="font-extrabold text-[15px] text-navy hover:text-teal transition-colors truncate block leading-snug"
            >
              {resource.name}
            </Link>
            <span className="text-xs text-muted truncate block">{resource.section.name}</span>
          </div>
        </div>
        <StatusPill status={resource.status} />
      </div>

      <div className="h-px bg-line" />

      {/* 2-col Category & Calibration */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-muted block text-[11px] font-semibold mb-0.5">Category</span>
          <span className="font-bold text-navy truncate block">{resource.category.name}</span>
        </div>
        <div>
          <span className="text-muted block text-[11px] font-semibold mb-0.5">Calibration</span>
          {resource.calibrationStatus === "FAILED" ? (
            <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-red-soft text-red border border-red/20">
              Check failed
            </span>
          ) : resource.calibrationStatus === "OVERDUE" ? (
            <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-soft text-amber border border-amber-line">
              Overdue
            </span>
          ) : resource.nextCalibrationDueOn ? (
            <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-soft text-amber-strong border border-amber-line">
              Due soon
            </span>
          ) : (
            <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-teal-soft text-teal-deep border border-teal-line">
              Current
            </span>
          )}
        </div>
      </div>

      {/* Actions row: Book (or Notify) & View */}
      <div className="flex items-center gap-2 pt-1">
        {canBook ? (
          <Button
            asChild
            size="sm"
            className="flex-1 h-9 rounded-xl bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-teal hover:opacity-95"
          >
            <Link
              href={`/book?resourceId=${resource.id}`}
              className="flex items-center justify-center gap-1.5"
            >
              <CalendarPlus className="size-3.5" />
              <span>Book</span>
            </Link>
          </Button>
        ) : isOos ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 h-9 rounded-xl border border-teal-soft bg-mint/30 hover:bg-mint text-teal font-bold text-xs"
          >
            <Link
              href={`/resources/${resource.id}#watch`}
              className="flex items-center justify-center gap-1.5"
            >
              <Bell className="size-3.5" />
              <span>Notify me</span>
            </Link>
          </Button>
        ) : null}

        <Button
          asChild
          variant="outline"
          size="sm"
          className="flex-1 h-9 rounded-xl border-card-edge bg-card hover:bg-canvas text-navy font-bold text-xs"
        >
          <Link
            href={`/resources/${resource.id}`}
            className="flex items-center justify-center gap-1.5"
          >
            <Eye className="size-3.5" />
            <span>View</span>
          </Link>
        </Button>

        {canManage && sites && categories && sections && (
          <ResourceEditDialog
            resource={resource}
            actorRole={actorRole}
            actorSiteId={actorSiteId ?? null}
            sites={sites}
            categories={categories}
            sections={sections}
            trigger={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 px-2.5 rounded-xl border-card-edge bg-card hover:bg-canvas text-navy font-bold text-xs shrink-0"
                title="Edit resource"
              >
                <Pencil className="size-3.5" />
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
