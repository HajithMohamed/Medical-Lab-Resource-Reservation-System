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
    <div className="rounded-2xl border border-card-edge bg-card p-6 sm:p-7 space-y-5 shadow-v4">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-navy">{title}</h3>
        {userName && (
          <p className="text-xs text-muted font-medium">
            Account for <strong className="font-bold text-navy">{userName}</strong>
            {userEmail ? <span className="opacity-80"> ({userEmail})</span> : null}
          </p>
        )}
      </div>

      {emailSent ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-teal-soft bg-mint/40 p-3 text-xs font-semibold text-teal-deep">
          <Mail className="size-4 text-teal shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Email sent: </span>Welcome email with credentials and
            activation link was delivered to{" "}
            <span className="font-bold text-navy">{userEmail}</span>.
          </div>
        </div>
      ) : emailError ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-line bg-amber-soft p-3 text-xs font-semibold text-amber">
          <AlertCircle className="size-4 text-amber-strong shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Notice: </span>
            Could not deliver email ({emailError}). Please copy the temporary password below and
            share it directly.
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-card-edge bg-canvas p-3 sm:p-4">
          <code className="font-mono text-lg sm:text-xl font-bold tracking-widest text-teal tabular-nums select-all">
            {temporaryPassword}
          </code>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 gap-1.5 font-bold text-xs bg-card hover:bg-canvas border-card-edge text-navy rounded-xl"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-teal" />
                <span className="text-teal font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted font-medium">
          {emailSent
            ? "The user can also sign in directly using the link in their email. They must change this password on first sign-in."
            : "Share this temporary password directly with the user. It will not be shown again."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
        {onAddAnother ? (
          <Button
            type="button"
            onClick={onAddAnother}
            className="gap-2 bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-teal hover:opacity-95"
          >
            <UserPlus className="size-3.5" />
            <span>Add another user</span>
          </Button>
        ) : (
          <Button
            asChild
            className="gap-2 bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-teal hover:opacity-95"
          >
            <Link href="/users/new">
              <UserPlus className="size-3.5" />
              <span>Add another user</span>
            </Link>
          </Button>
        )}

        <Button
          asChild
          variant="outline"
          className="text-xs font-bold text-navy hover:bg-canvas border-card-edge rounded-xl"
        >
          <Link href="/users" className="gap-2">
            <ArrowLeft className="size-3.5" />
            <span>Back to users</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
