import * as React from "react";
import {
  Dna,
  FlaskConical,
  Microscope,
  ShieldCheck,
  Flame,
  DoorOpen,
  Truck,
  Box,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  molecular: Dna,
  analytical: FlaskConical,
  microscopy: Microscope,
  biosafety: ShieldCheck,
  sterilisation: Flame,
  room: DoorOpen,
  vehicle: Truck,
  other: Box,
};

export const CATEGORY_ICON_NAME_MAP: Record<string, string> = {
  molecular: "Dna",
  analytical: "FlaskConical",
  microscopy: "Microscope",
  biosafety: "ShieldCheck",
  sterilisation: "Flame",
  room: "DoorOpen",
  vehicle: "Truck",
  other: "Box",
};

/**
 * Pure function returning the icon name for a given category key (fallback: "Box").
 */
export function getCategoryIconName(key: string): string {
  return CATEGORY_ICON_NAME_MAP[key] ?? "Box";
}

/**
 * Returns the Lucide icon component for a given category key (fallback: Box).
 */
export function getCategoryIcon(key: string): LucideIcon {
  return CATEGORY_ICON_MAP[key] ?? Box;
}

export interface CategoryIconProps {
  iconKey: string;
  className?: string;
  iconClassName?: string;
}

function renderCategoryIcon(key: string, className?: string) {
  switch (key) {
    case "molecular":
      return <Dna className={className} />;
    case "analytical":
      return <FlaskConical className={className} />;
    case "microscopy":
      return <Microscope className={className} />;
    case "biosafety":
      return <ShieldCheck className={className} />;
    case "sterilisation":
      return <Flame className={className} />;
    case "room":
      return <DoorOpen className={className} />;
    case "vehicle":
      return <Truck className={className} />;
    default:
      return <Box className={className} />;
  }
}

export function CategoryIcon({ iconKey, className, iconClassName }: CategoryIconProps) {
  return (
    <div
      className={cn(
        "size-8 rounded-lg bg-surface-container-high border border-outline-variant text-primary flex items-center justify-center shrink-0 shadow-2xs",
        className,
      )}
      aria-hidden="true"
    >
      {renderCategoryIcon(iconKey, cn("size-4", iconClassName))}
    </div>
  );
}
