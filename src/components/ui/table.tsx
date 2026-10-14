"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto rounded-lg border border-[#334155] bg-[#141c2b] shadow-sm">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm text-left border-collapse", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-[#222a3a]/70 border-b border-[#334155] text-xs font-mono uppercase tracking-wider text-[#94a3b8]", className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("divide-y divide-[#334155]/40 text-sm text-[#dbe2f8] [&_tr:last-child]:border-0", className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn("border-t border-[#334155] bg-[#18202f] p-3 text-xs font-mono text-[#94a3b8] font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "group border-b border-[#334155]/40 transition-colors duration-150 hover:bg-[#222a3a]/50 data-[state=selected]:bg-[#222a3a]",
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-4 text-left align-middle font-semibold whitespace-nowrap text-[#94a3b8] font-mono text-xs uppercase tracking-wider [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("py-3 px-4 align-middle whitespace-nowrap text-sm text-[#dbe2f8] [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-[#94a3b8]", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
