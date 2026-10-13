"use client";

import * as React from "react";
import { useActionState } from "react";
import { login, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";

interface LoginFormProps {
  defaultEmail?: string;
}

export function LoginForm({ defaultEmail }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<AuthActionState | undefined, FormData>(
    login,
    undefined,
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [showForgotNotice, setShowForgotNotice] = React.useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <div aria-live="polite" aria-atomic="true">
        {state?.error && (
          <Alert variant="destructive" className="py-2 px-3 text-xs">
            <AlertCircle className="size-3.5 shrink-0" />
            <AlertDescription className="text-xs">{state.error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Email input */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-foreground">
          Email address
        </Label>
        <div className="relative">
          <Mail
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={defaultEmail}
            placeholder="e.g. kasun.silva@lab.example"
            disabled={isPending}
            className="h-11 pl-10 pr-3 text-sm bg-card border-input rounded-xl focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Password input */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-bold text-foreground">
          Password
        </Label>
        <div className="relative">
          <Lock
            className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            disabled={isPending}
            className="h-11 pl-10 pr-10 text-sm bg-card border-input rounded-xl focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Remember me & Forgot password row */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted-foreground hover:text-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-input text-primary focus:ring-ring cursor-pointer"
          />
          <span>Remember me</span>
        </label>

        <button
          type="button"
          onClick={() => setShowForgotNotice((prev) => !prev)}
          className="text-primary font-bold hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
        >
          Forgot password?
        </button>
      </div>

      {/* Forgot password notice */}
      {showForgotNotice && (
        <div className="rounded-lg bg-secondary/40 border border-secondary p-2.5 text-xs text-secondary-foreground space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1 font-semibold text-primary">
            <Info className="size-3.5 shrink-0" />
            <span>Password resets</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Staff accounts are managed by your lab manager. Contact your manager or email{" "}
            <span className="font-mono">admin@lab.example</span> for a temporary password.
          </p>
        </div>
      )}

      {/* Submit Button (Our design system button theme: solid bg-primary) */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 rounded-xl font-semibold text-sm shadow-xs transition-all active:scale-[0.99] cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Signing in...
          </>
        ) : (
          <span className="inline-flex items-center justify-center gap-2 w-full">
            <span>Sign in</span>
            <ArrowRight className="size-4" />
          </span>
        )}
      </Button>

      {/* Divider and security notice */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <span className="text-[11px] font-medium">
            Your account and reservation details stay protected.
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground/75 text-center">
          Authorized users only · Medical Lab Resource Reservation System
        </p>
      </div>
    </form>
  );
}
