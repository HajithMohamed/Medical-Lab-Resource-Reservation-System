"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalDialogProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  onClose?: () => void;
}

export function ModalDialog({
  children,
  title,
  description,
  maxWidth = "3xl",
  className,
  onClose,
}: ModalDialogProps) {
  const router = useRouter();

  const handleClose = React.useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }, [router, onClose]);

  // Handle ESC key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose]);

  // Prevent background body scroll while modal is active
  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const maxWidthClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    "4xl": "sm:max-w-4xl",
    "5xl": "sm:max-w-5xl",
  }[maxWidth];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Popup dialog"}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-navy/40 backdrop-blur-xs animate-in fade-in duration-150"
        aria-hidden="true"
      />

      {/* Modal Window (max 85vh, internal scroll) */}
      <div
        className={cn(
          "relative z-10 w-full max-h-[85vh] flex flex-col rounded-3xl border border-card-edge bg-card text-ink shadow-v4 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150",
          maxWidthClass,
          className,
        )}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-card-edge bg-canvas/60 shrink-0">
          <div className="min-w-0 pr-4">
            {title && (
              <h2 className="text-base font-bold text-navy tracking-tight truncate">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-muted mt-0.5 truncate">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close dialog"
            className="rounded-xl p-1.5 text-muted hover:text-navy hover:bg-mint transition-colors cursor-pointer shrink-0 ml-auto border border-transparent hover:border-card-edge"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Content Inside (85vh bounded) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
