"use client";

import * as React from "react";
import { useActionState } from "react";
import { changePassword, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/config/rules";

export function ChangePasswordForm({ mustChange }: { mustChange: boolean }) {
  const [state, formAction, isPending] = useActionState<AuthActionState | undefined, FormData>(
    changePassword,
    undefined,
  );

  const [newPasswordValue, setNewPasswordValue] = React.useState("");
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div aria-live="polite" aria-atomic="true">
        {state?.error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4 shrink-0" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword" className="text-xs font-bold text-slate-200">
          Current password
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((p) => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6cd8cb] rounded p-1"
            aria-label={showCurrent ? "Hide current password" : "Show current password"}
          >
            {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="newPassword" className="text-xs font-bold text-slate-200">
            New password
          </Label>
          <span
            className={`text-xs tabular-nums font-semibold font-mono ${
              newPasswordValue.length >= PASSWORD_MIN_LENGTH &&
              newPasswordValue.length <= PASSWORD_MAX_LENGTH
                ? "text-emerald-400"
                : newPasswordValue.length > PASSWORD_MAX_LENGTH
                  ? "text-rose-400"
                  : "text-slate-400"
            }`}
          >
            {newPasswordValue.length} / {PASSWORD_MAX_LENGTH} characters
          </span>
        </div>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            required
            value={newPasswordValue}
            onChange={(e) => setNewPasswordValue(e.target.value)}
            className="pr-10"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowNew((p) => !p)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#6cd8cb] rounded p-1"
            aria-label={showNew ? "Hide new password" : "Show new password"}
          >
            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {/* Short list of rules & tip */}
        <div className="rounded-xl bg-[#18202f] border border-[#334155] p-3.5 text-xs text-slate-400 space-y-1.5">
          <p className="font-semibold text-slate-200">Password rules:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Use at least 15 characters (Tip: join three or four random words).</li>
            <li>At most 64 characters (and 72 bytes).</li>
            <li>Must not be a common or guessable password.</li>
            <li>Must not contain your email username.</li>
            <li>Spaces are allowed; symbols or numbers are optional.</li>
          </ul>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-200">
          Confirm new password
        </Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          disabled={isPending}
        />
      </div>

      <Button
        type="submit"
        variant="default"
        className="w-full h-11 font-bold text-sm bg-[#6cd8cb] text-[#003732] hover:bg-[#29a195] hover:text-[#002421] rounded-xl shadow-xs"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Updating password...
          </>
        ) : mustChange ? (
          "Save new password and continue"
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
}
