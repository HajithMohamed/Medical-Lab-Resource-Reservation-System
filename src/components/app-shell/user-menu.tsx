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
import { Ellipsis, KeyRound, LogOut } from "lucide-react";

export interface UserMenuProps {
  user: {
    name: string;
    role: string;
    siteName?: string;
  };
  logoutAction?: () => void | Promise<void>;
  minimal?: boolean;
}

export function UserMenu({ user, logoutAction, minimal = false }: UserMenuProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const roleDisplay =
    user.role === "ADMIN"
      ? "Network admin"
      : user.role === "MANAGER"
        ? `Manager · ${user.siteName ?? "Site"}`
        : `Staff · ${user.siteName ?? "Lab"}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {minimal ? (
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-teal-soft border border-teal-line flex items-center justify-center text-teal-deep font-extrabold text-xs cursor-pointer hover:opacity-90 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-focus shrink-0"
            aria-label={`User menu for ${user.name}`}
          >
            {initials}
          </button>
        ) : (
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl p-1.5 hover:bg-mint text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus cursor-pointer group"
            aria-label="Account menu"
          >
            <span
              className="w-10 h-10 rounded-full bg-teal-soft border border-teal-line flex items-center justify-center text-teal-deep font-extrabold text-[13px] shrink-0"
              aria-hidden="true"
            >
              {initials}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[13.5px] font-bold text-navy truncate leading-tight group-hover:text-teal-deep">
                {user.name}
              </span>
              <span className="text-[11.5px] text-muted truncate leading-tight mt-0.5">
                {roleDisplay}
              </span>
            </div>
            <span
              className="p-1 rounded-md text-muted group-hover:text-navy transition-colors shrink-0"
              aria-hidden="true"
            >
              <Ellipsis className="size-4" />
            </span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side="top"
        className="w-56 bg-card border-card-edge text-ink shadow-v4 rounded-xl p-1.5 z-50"
      >
        <DropdownMenuLabel className="font-normal px-2.5 py-2">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-bold text-navy leading-tight">{user.name}</p>
            <p className="text-xs text-muted leading-tight">{roleDisplay}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-line my-1" />
        <DropdownMenuItem asChild className="hover:bg-mint focus:bg-mint rounded-lg cursor-pointer">
          <Link
            href="/change-password"
            className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-navy hover:text-teal-deep"
          >
            <KeyRound className="size-4 text-teal" />
            <span>Change password</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-line my-1" />
        <DropdownMenuItem
          asChild
          className="hover:bg-red-soft focus:bg-red-soft rounded-lg cursor-pointer"
        >
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 px-2.5 py-2 text-xs font-semibold text-left text-red hover:text-red cursor-pointer"
            >
              <LogOut className="size-4 text-red" />
              <span>Sign out</span>
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
