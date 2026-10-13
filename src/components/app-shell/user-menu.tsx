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
          className="flex w-full items-center gap-2.5 rounded-lg p-2 bg-surface-container-low border border-border/80 text-left hover:bg-surface-container hover:border-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs"
          aria-label="User menu"
        >
          <Avatar className="size-8 rounded bg-primary/20 text-primary font-mono font-bold text-xs border border-primary/30 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-foreground truncate">{user.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground truncate">
              {user.role} • {user.siteName ?? "All sites"}
            </span>
          </div>
          <ChevronUp className="size-3.5 text-muted-foreground ml-auto shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        className="w-56 bg-card border-border shadow-xl rounded-lg"
      >
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-foreground">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.role} {user.siteName ? `· ${user.siteName}` : ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/change-password" className="flex items-center gap-2 cursor-pointer">
            <KeyRound className="size-4 text-muted-foreground" />
            <span>Change password</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action={logoutAction} className="w-full">
            <button
              type="submit"
              className="flex w-full items-center gap-2 text-left cursor-pointer text-destructive focus:text-destructive"
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
