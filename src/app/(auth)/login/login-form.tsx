"use client";

import * as React from "react";
import { useActionState } from "react";
import { login, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<AuthActionState | undefined, FormData>(
    login,
    undefined,
  );
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <div aria-live="polite" aria-atomic="true">
        {state?.error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4 shrink-0" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="e.g. kasun.silva@lab.example"
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-10"
            disabled={isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-1"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        variant="default"
        className="w-full h-10 font-semibold"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin mr-2" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-xs text-muted-foreground leading-relaxed pt-2">
        Accounts are created by your lab manager. Forgot your password? Ask your manager to reset
        it.
      </p>
    </form>
  );
}
