"use client";

import * as React from "react";
import { useActionState } from "react";
import { login, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, Info } from "lucide-react";

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
          <Alert
            variant="destructive"
            className="py-2.5 px-3.5 text-xs rounded-xl bg-red-soft border-red/30 text-red"
          >
            <AlertCircle className="size-4 shrink-0 text-red mr-2" />
            <AlertDescription className="text-xs font-semibold">{state.error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Email input */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-navy">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          placeholder="kasun.silva@lab.example"
          disabled={isPending}
          className="h-11 px-3.5 text-sm bg-canvas border border-card-edge rounded-xl text-navy placeholder:text-faint focus:border-teal outline-none"
        />
      </div>

      {/* Password input */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-bold text-navy">
            Password
          </Label>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            disabled={isPending}
            className="h-11 pl-3.5 pr-10 text-sm bg-canvas border border-card-edge rounded-xl text-navy placeholder:text-faint focus:border-teal outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy focus-visible:outline-none rounded p-1 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Remember me & Forgot password row */}
      <div className="flex items-center justify-between text-xs pt-0.5">
        <label className="flex items-center gap-1.5 cursor-pointer select-none text-muted hover:text-navy font-medium">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-3.5 rounded border-card-edge text-teal accent-teal cursor-pointer"
          />
          <span>Remember me</span>
        </label>

        <button
          type="button"
          onClick={() => setShowForgotNotice((prev) => !prev)}
          className="text-teal font-bold hover:underline focus-visible:outline-none"
        >
          Forgot password?
        </button>
      </div>

      {/* Forgot password notice */}
      {showForgotNotice && (
        <div className="rounded-xl bg-amber-soft border border-amber-line p-3 text-xs text-amber space-y-1 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5 font-bold text-amber-strong">
            <Info className="size-3.5 shrink-0" />
            <span>Password resets</span>
          </div>
          <p className="text-[11.5px] text-amber/90 leading-relaxed font-medium">
            Staff accounts are managed by your lab manager. Ask your site manager for a temporary
            password.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-12 rounded-xl font-bold text-sm bg-gradient-to-br from-teal to-teal-deep text-white shadow-md hover:opacity-95 transition-all active:scale-[0.99] cursor-pointer"
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            <span>Signing in...</span>
          </>
        ) : (
          <span className="inline-flex items-center justify-center gap-2 w-full">
            <LogIn className="size-4" />
            <span>Sign in</span>
          </span>
        )}
      </Button>

      {/* Helper note */}
      <p className="text-xs text-muted text-center pt-1 font-medium">
        Forgot your password? Ask your site manager.
      </p>
    </form>
  );
}
