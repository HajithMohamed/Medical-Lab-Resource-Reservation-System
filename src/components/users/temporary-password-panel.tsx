"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, ArrowLeft, UserPlus, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemporaryPasswordPanelProps {
  userName?: string;
  userEmail?: string;
  temporaryPassword: string;
  emailSent?: boolean;
  emailError?: string;
  onAddAnother?: () => void;
  title?: string;
}

export function TemporaryPasswordPanel({
  userName,
  userEmail,
  temporaryPassword,
  emailSent,
  emailError,
  onAddAnother,
  title = "Temporary password generated",
}: TemporaryPasswordPanelProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is not available
    }
  };

  return (
    <div className="rounded-xl border border-secondary-foreground/20 bg-secondary/70 p-6 sm:p-8 space-y-6">
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-secondary-foreground">{title}</h3>
        {userName && (
          <p className="text-sm text-secondary-foreground/80">
            Account for <span className="font-semibold text-secondary-foreground">{userName}</span>
            {userEmail ? <span className="text-xs opacity-75"> ({userEmail})</span> : null}
          </p>
        )}
      </div>

      {emailSent ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
          <Mail className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Email sent successfully: </span>A welcome email with
            these credentials and the change password link was delivered to{" "}
            <span className="font-semibold">{userEmail}</span>.
          </div>
        </div>
      ) : emailError ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs sm:text-sm text-amber-950 dark:text-amber-200">
          <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Email notification notice: </span>
            Could not deliver email ({emailError}). Please copy the temporary password below and
            share it directly.
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 sm:p-4">
          <code className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-foreground tabular-nums select-all">
            {temporaryPassword}
          </code>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 gap-1.5 font-medium"
          >
            {copied ? (
              <>
                <Check className="size-4 text-pass" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-sm font-medium text-destructive-ink">
          {emailSent
            ? "The user can also sign in directly using the link in their email. They must change this password on first sign-in."
            : "Give it to the person directly. It will not be shown again. They must change it when they first sign in."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {onAddAnother ? (
          <Button type="button" onClick={onAddAnother} className="gap-2">
            <UserPlus className="size-4" />
            <span>Add another user</span>
          </Button>
        ) : (
          <Button asChild className="gap-2">
            <Link href="/users/new">
              <UserPlus className="size-4" />
              <span>Add another user</span>
            </Link>
          </Button>
        )}

        <Button asChild variant="outline">
          <Link href="/users" className="gap-2">
            <ArrowLeft className="size-4" />
            <span>Back to users</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
