"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdaptiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdaptiveDialog({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
  actions,
  className,
}: AdaptiveDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy/38 backdrop-blur-xs transition-opacity duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-50 flex flex-col bg-card shadow-2xl transition-all duration-300 ease-in-out outline-none",
            // Mobile: bottom sheet
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-[24px] border-t border-card-edge animate-in slide-in-from-bottom duration-200",
            // Desktop/Tablet (≥ 640px): centered dialog card
            "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-[480px] sm:rounded-[20px] sm:border sm:border-card-edge sm:slide-in-from-top-2 sm:zoom-in-95",
            className,
          )}
        >
          {/* Mobile grab handle */}
          <div className="flex sm:hidden justify-center pt-3 pb-1">
            <div className="h-1.5 w-11 rounded-full bg-line" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-3">
            <div className="flex items-start gap-3">
              {icon && (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal">
                  {icon}
                </div>
              )}
              <div className="space-y-0.5">
                <DialogPrimitive.Title className="text-lg font-extrabold text-navy tracking-tight">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-xs text-muted leading-relaxed">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            </div>
            <DialogPrimitive.Close className="flex size-8 items-center justify-center rounded-lg border border-card-edge bg-canvas hover:bg-line text-navy transition-colors shrink-0">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm">{children}</div>

          {/* Footer */}
          {actions && (
            <div className="p-4 sm:p-5 border-t border-line bg-card flex flex-col sm:flex-row justify-end items-center gap-2.5">
              {actions}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
