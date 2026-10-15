"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AutoFilterProps extends React.FormHTMLAttributes<HTMLFormElement> {
  action?: string;
  preserveParams?: string[];
  debounceMs?: number;
  resetPageOnFilter?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * AutoFilter wraps filter controls in a client-side form that automatically
 * applies filters to the URL search params without requiring an "Apply" button.
 *
 * - Text and search inputs are debounced by 300ms.
 * - Selects, dates, and checkboxes apply immediately.
 * - Updates URL using router.replace(..., { scroll: false }) to preserve scroll position.
 * - Automatically removes or resets 'page' param so new filters return to page 1.
 */
export function AutoFilter({
  action,
  preserveParams = ["tab", "view", "range"],
  debounceMs = 300,
  resetPageOnFilter = true,
  children,
  className,
  ...props
}: AutoFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const formRef = React.useRef<HTMLFormElement>(null);
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyFilters = React.useCallback(() => {
    if (!formRef.current) return;
    const form = formRef.current;
    const formData = new FormData(form);
    const targetUrl = action || pathname;
    const nextParams = new URLSearchParams();

    // Preserve configured keys from current URL if not already present in the form
    for (const key of preserveParams) {
      const val = searchParams.get(key);
      if (val !== null && !formData.has(key)) {
        nextParams.set(key, val);
      }
    }

    // Process all entries from the form
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        // Skip empty strings
        if (trimmed !== "") {
          nextParams.set(key, trimmed);
        }
      }
    }

    // Reset pagination to page 1
    if (resetPageOnFilter) {
      nextParams.delete("page");
    }

    const qs = nextParams.toString();
    const destination = qs ? `${targetUrl}?${qs}` : targetUrl;
    router.replace(destination, { scroll: false });
  }, [action, pathname, searchParams, preserveParams, resetPageOnFilter, router]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLFormElement>) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const type = (target as HTMLInputElement).type?.toLowerCase();

      // Debounce text-like inputs
      if (tag === "input" && (type === "text" || type === "search" || type === "number")) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          applyFilters();
        }, debounceMs);
      } else {
        // Immediate for selects, dates, checkboxes, radios
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        applyFilters();
      }
    },
    [applyFilters, debounceMs],
  );

  const handleInput = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const type = (target as HTMLInputElement).type?.toLowerCase();

      if (tag === "input" && (type === "text" || type === "search" || type === "number")) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          applyFilters();
        }, debounceMs);
      }
    },
    [applyFilters, debounceMs],
  );

  const handleSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      applyFilters();
    },
    [applyFilters],
  );

  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <form
      ref={formRef}
      method="GET"
      action={action || pathname}
      onChange={handleChange}
      onInput={handleInput}
      onSubmit={handleSubmit}
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </form>
  );
}

export interface ClearFiltersButtonProps {
  href?: string;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function ClearFiltersButton({
  href,
  onClick,
  className,
  children = "Clear filters",
}: ClearFiltersButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (href) {
      e.preventDefault();
      router.replace(href, { scroll: false });
    } else {
      e.preventDefault();
      router.replace(pathname, { scroll: false });
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleClick}
      aria-label="Clear filters"
      className={cn(
        "h-8 px-2 text-xs font-mono text-[#94a3b8] hover:text-white transition-colors cursor-pointer",
        className,
      )}
    >
      <X className="size-3.5 mr-1 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </Button>
  );
}
