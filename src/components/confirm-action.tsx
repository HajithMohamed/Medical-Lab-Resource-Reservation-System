"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConfirmActionProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  action?: (formData: FormData) => void | Promise<{ ok?: boolean; error?: string } | void>;
  children?: React.ReactNode;
}

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isDestructive = false,
  action,
  children,
}: ConfirmActionProps) {
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setError(null);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md">
        <form
          action={async (formData) => {
            if (action) {
              setIsPending(true);
              setError(null);
              try {
                const res = await action(formData);
                if (res && res.ok === false) {
                  setError(res.error ?? "Action could not be completed.");
                  setIsPending(false);
                  return; // Keep dialog open!
                }
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
                setError(msg);
                setIsPending(false);
                return;
              }
              setIsPending(false);
            }
            setOpen(false);
          }}
          className="space-y-4"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          {children && <div className="space-y-3">{children}</div>}

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              {cancelLabel}
            </AlertDialogCancel>
            <button
              type="submit"
              disabled={isPending}
              className={cn(
                buttonVariants({
                  variant: isDestructive ? "destructive" : "default",
                }),
              )}
            >
              {isPending ? "Please wait..." : confirmLabel}
            </button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
