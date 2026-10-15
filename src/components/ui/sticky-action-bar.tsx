"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function StickyActionBar({ children, className }: StickyActionBarProps) {
  return (
    <div
      className={cn(
        "fixed md:static inset-x-0 bottom-0 z-40 bg-card/95 backdrop-blur-md md:bg-transparent border-t md:border-t-0 border-card-edge shadow-up md:shadow-none p-3.5 md:p-0 flex items-center gap-3 justify-end",
        className,
      )}
    >
      {children}
    </div>
  );
}
