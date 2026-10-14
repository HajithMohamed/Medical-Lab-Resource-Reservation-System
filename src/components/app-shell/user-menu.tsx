"use client";

import * as React from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronUp, KeyRound, LogOut } from "lucide-react";

export interface UserMenuProps {
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  logoutAction?: () => void | Promise<void>;
}

export function UserMenu({ user, logoutAction }: UserMenuProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg p-2 bg-[#141c2b] border border-[#334155] text-left hover:bg-[#222a3a] hover:border-[#6cd8cb]/40 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#6cd8cb] shadow-2xs"
          aria-label="User menu"
        >
          <Avatar className="size-8 rounded bg-[#6cd8cb]/20 text-[#6cd8cb] font-mono font-bold text-xs border border-[#6cd8cb]/30 shrink-0">
            <AvatarFallback className="bg-[#6cd8cb]/20 text-[#6cd8cb]">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-white truncate">{user.name}</span>
            <span className="font-mono text-[10.5px] text-[#94a3b8] truncate">
              {user.role} • {user.siteName ?? "All sites"}
            </span>
          </div>
          <ChevronUp className="size-3.5 text-[#94a3b8] ml-auto shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="w-56 bg-[#18202f] border-[#334155] text-[#dbe2f8] shadow-xl rounded-lg"
      >
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-white">{user.name}</p>
            <p className="text-xs leading-none text-[#94a3b8]">
              {user.role} {user.siteName ? `· ${user.siteName}` : ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#334155]/60" />
        <DropdownMenuItem asChild className="hover:bg-[#222a3a] focus:bg-[#222a3a]">
          <Link
            href="/change-password"
            className="flex items-center gap-2 cursor-pointer text-[#dbe2f8] hover:text-white"
          >
            <KeyRound className="size-4 text-[#6cd8cb]" />
            <span>Change password</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#334155]/60" />
        <DropdownMenuItem asChild className="hover:bg-[#222a3a] focus:bg-[#222a3a]">
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left cursor-pointer text-rose-400 hover:text-rose-300 focus:text-rose-300"
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
