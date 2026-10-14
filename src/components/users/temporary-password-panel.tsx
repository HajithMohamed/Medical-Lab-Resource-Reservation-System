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
    <div className="rounded-xl border border-[#334155] bg-[#141c2b] p-6 sm:p-7 space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {userName && (
          <p className="text-xs text-[#94a3b8] font-mono">
            Account for <strong className="font-semibold text-white">{userName}</strong>
            {userEmail ? <span className="opacity-80"> ({userEmail})</span> : null}
          </p>
        )}
      </div>

      {emailSent ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-300">
          <Mail className="size-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Email sent: </span>Welcome email with credentials and activation link was delivered to{" "}
            <span className="font-semibold text-white">{userEmail}</span>.
          </div>
        </div>
      ) : emailError ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-mono text-amber-300">
          <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice: </span>
            Could not deliver email ({emailError}). Please copy the temporary password below and share it directly.
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#334155] bg-[#060e1d] p-3 sm:p-4">
          <code className="font-mono text-lg sm:text-xl font-bold tracking-widest text-[#6cd8cb] tabular-nums select-all">
            {temporaryPassword}
          </code>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 gap-1.5 font-mono text-xs bg-[#18202f] hover:bg-[#222a3a] border-[#334155] text-white"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-[#6cd8cb]" />
                <span className="text-[#6cd8cb]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>

        <p className="text-xs font-mono text-[#94a3b8]">
          {emailSent
            ? "The user can also sign in directly using the link in their email. They must change this password on first sign-in."
            : "Share this temporary password directly with the user. It will not be shown again."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#334155]/40">
        {onAddAnother ? (
          <Button
            type="button"
            onClick={onAddAnother}
            className="gap-2 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-xs"
          >
            <UserPlus className="size-3.5" />
            <span>Add another user</span>
          </Button>
        ) : (
          <Button
            asChild
            className="gap-2 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono shadow-xs"
          >
            <Link href="/users/new">
              <UserPlus className="size-3.5" />
              <span>Add another user</span>
            </Link>
          </Button>
        )}

        <Button asChild variant="outline" className="text-xs font-mono text-[#dbe2f8] hover:bg-[#222a3a] border-[#334155]">
          <Link href="/users" className="gap-2">
            <ArrowLeft className="size-3.5" />
            <span>Back to users</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
