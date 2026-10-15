"use client";

import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PeekSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow?: string;
  title: string;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function PeekSheet({
  open,
  onOpenChange,
  eyebrow,
  title,
  statusBadge,
  children,
  actions,
}: PeekSheetProps) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/38 backdrop-blur-xs transition-opacity duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <SheetPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col bg-card shadow-2xl transition-all duration-300 ease-in-out outline-none",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-[24px] border-t border-card-edge animate-in slide-in-from-bottom duration-200",
            // Desktop (≥ 768px): right sheet
            "md:inset-y-0 md:right-0 md:left-auto md:w-full md:max-w-[440px] md:max-h-full md:rounded-l-[24px] md:rounded-t-none md:border-l md:border-t-0 md:slide-in-from-right",
          )}
        >
          {/* Mobile grab handle */}
          <div className="flex md:hidden justify-center pt-3 pb-1">
            <div className="h-1.5 w-11 rounded-full bg-line" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-4 pb-3 border-b border-line">
            <div className="space-y-1 min-w-0 pr-4">
              {eyebrow && (
                <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-teal">
                  {eyebrow}
                </div>
              )}
              <SheetPrimitive.Title className="text-xl font-extrabold text-navy tracking-tight truncate">
                {title}
              </SheetPrimitive.Title>
              {statusBadge && <div className="pt-1">{statusBadge}</div>}
            </div>
            <SheetPrimitive.Close className="flex size-9 items-center justify-center rounded-xl border border-card-edge bg-canvas hover:bg-line text-navy transition-colors shrink-0">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </SheetPrimitive.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 text-sm space-y-4">{children}</div>

          {/* Sticky Actions Footer */}
          {actions && (
            <div className="p-4 sm:p-5 border-t border-line bg-card flex flex-col sm:flex-row items-center gap-2.5">
              {actions}
            </div>
          )}
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
