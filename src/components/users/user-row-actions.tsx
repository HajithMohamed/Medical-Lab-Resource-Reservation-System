"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, KeyRound, UserMinus, UserCheck } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TemporaryPasswordPanel } from "@/components/users/temporary-password-panel";
import { resetPasswordAction, setActiveAction } from "@/actions/users";
import { cn } from "@/lib/utils";

interface UserRowActionsProps {
  user: {
    id: string;
    name: string;
    isActive: boolean;
  };
  isSelf: boolean;
  upcomingBookingsCount: number;
}

export function UserRowActions({ user, isSelf, upcomingBookingsCount }: UserRowActionsProps) {
  const router = useRouter();

  const [resetDialogOpen, setResetDialogOpen] = React.useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = React.useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = React.useState(false);

  const [isPending, setIsPending] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = React.useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setActionError(null);

    const res = await resetPasswordAction(user.id);
    setIsPending(false);

    if (!res.ok) {
      setActionError(res.error ?? "Failed to reset password.");
      return;
    }

    setResetDialogOpen(false);
    if (res.temporaryPassword) {
      setTemporaryPassword(res.temporaryPassword);
    }
  };

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setActionError(null);

    const res = await setActiveAction(user.id, false);
    setIsPending(false);

    if (!res.ok) {
      setActionError(res.error ?? "Failed to deactivate account.");
      return;
    }

    setDeactivateDialogOpen(false);
    toast.success("Account deactivated");
    router.refresh();
  };

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setActionError(null);

    const res = await setActiveAction(user.id, true);
    setIsPending(false);

    if (!res.ok) {
      setActionError(res.error ?? "Failed to reactivate account.");
      return;
    }

    setReactivateDialogOpen(false);
    toast.success("Account reactivated");
    router.refresh();
  };

  const bookingText =
    upcomingBookingsCount === 1
      ? "their 1 upcoming booking is"
      : `their ${upcomingBookingsCount} upcoming bookings are`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Actions for {user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/users/${user.id}`} className="cursor-pointer">
              <Pencil className="size-4 mr-2" />
              <span>Edit</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => {
              setActionError(null);
              setResetDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <KeyRound className="size-4 mr-2" />
            <span>Reset password</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user.isActive ? (
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={() => {
                if (!isSelf) {
                  setActionError(null);
                  setDeactivateDialogOpen(true);
                }
              }}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <UserMinus className="size-4 mr-2" />
              <span>Deactivate</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => {
                setActionError(null);
                setReactivateDialogOpen(true);
              }}
              className="cursor-pointer text-pass focus:text-pass"
            >
              <UserCheck className="size-4 mr-2" />
              <span>Reactivate</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reset Password Alert Dialog */}
      <AlertDialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) setActionError(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset password</AlertDialogTitle>
              <AlertDialogDescription>
                Generate a new temporary password for {user.name}? Their active sessions will be
                signed out and they must change the password upon signing in.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {actionError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {actionError}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isPending}>
                Cancel
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={isPending}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                {isPending ? "Generating..." : "Reset password"}
              </button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Alert Dialog */}
      <AlertDialog
        open={deactivateDialogOpen}
        onOpenChange={(open) => {
          setDeactivateDialogOpen(open);
          if (!open) setActionError(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <form onSubmit={handleDeactivate} className="space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate {user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Deactivate {user.name}? They are signed out at once and {bookingText} cancelled.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {actionError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {actionError}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isPending}>
                Cancel
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={isPending}
                className={cn(buttonVariants({ variant: "destructive" }))}
              >
                {isPending ? "Deactivating..." : "Deactivate account"}
              </button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Alert Dialog */}
      <AlertDialog
        open={reactivateDialogOpen}
        onOpenChange={(open) => {
          setReactivateDialogOpen(open);
          if (!open) setActionError(null);
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <form onSubmit={handleReactivate} className="space-y-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Reactivate {user.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Reactivate {user.name}? They will be able to sign in and make bookings again.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {actionError && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {actionError}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel type="button" disabled={isPending}>
                Cancel
              </AlertDialogCancel>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "bg-pass hover:bg-pass/90 text-pass-foreground",
                )}
              >
                {isPending ? "Reactivating..." : "Reactivate account"}
              </button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Temporary Password Dialog */}
      <Dialog
        open={!!temporaryPassword}
        onOpenChange={(open) => {
          if (!open) setTemporaryPassword(null);
        }}
      >
        <DialogContent className="sm:max-w-xl p-0 border-none bg-transparent shadow-none">
          <DialogTitle className="sr-only">Temporary Password</DialogTitle>
          {temporaryPassword && (
            <TemporaryPasswordPanel
              userName={user.name}
              temporaryPassword={temporaryPassword}
              title="Temporary password generated"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
