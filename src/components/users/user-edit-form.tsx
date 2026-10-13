"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, UserMinus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmAction } from "@/components/confirm-action";
import { UserStatusPill } from "@/components/users/user-status-pill";
import { TemporaryPasswordPanel } from "@/components/users/temporary-password-panel";
import {
  updateUserAction,
  resetPasswordAction,
  setActiveAction,
  type UserActionResult,
} from "@/actions/users";
import type { Role } from "@/generated/prisma/client";

interface UserEditFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    siteId: string | null;
    sectionId: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    lockedUntil: Date | null;
    site?: { id: string; name: string } | null;
    section?: { id: string; name: string } | null;
  };
  actorId: string;
  actorRole: Role;
  upcomingBookingsCount: number;
  sites: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
}

export function UserEditForm({
  user,
  actorId,
  actorRole,
  upcomingBookingsCount,
  sites,
  sections,
}: UserEditFormProps) {
  const router = useRouter();

  const [name, setName] = React.useState(user.name);
  const [role, setRole] = React.useState<Role>(user.role);
  const [siteId, setSiteId] = React.useState<string>(user.siteId ?? sites[0]?.id ?? "");
  const [sectionId, setSectionId] = React.useState<string>(user.sectionId ?? "none");

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [temporaryPassword, setTemporaryPassword] = React.useState<string | null>(null);

  const isAdmin = actorRole === "ADMIN";
  const isSelf = actorId === user.id;
  const canEditRoleAndSite = isAdmin && !isSelf;
  const showSiteSelect = canEditRoleAndSite && role !== "ADMIN";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccessMessage(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("name", name);
    if (canEditRoleAndSite) {
      formData.set("role", role);
      if (role !== "ADMIN") {
        formData.set("siteId", siteId);
      }
    }
    if (sectionId && sectionId !== "none") {
      formData.set("sectionId", sectionId);
    } else {
      formData.set("sectionId", "");
    }

    const result: UserActionResult = await updateUserAction(user.id, null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to update user.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    setSuccessMessage(result.message ?? "User details updated successfully.");
    router.refresh();
  };

  if (temporaryPassword) {
    return (
      <div className="max-w-[640px]">
        <TemporaryPasswordPanel
          userName={user.name}
          temporaryPassword={temporaryPassword}
          title="New temporary password generated"
        />
      </div>
    );
  }

  const upcomingCount = upcomingBookingsCount;
  const bookingText =
    upcomingCount === 1
      ? "their 1 upcoming booking is"
      : `their ${upcomingCount} upcoming bookings are`;

  return (
    <div className="space-y-6 max-w-[640px]">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/users">
            <ArrowLeft className="size-4" />
            <span>Back to users</span>
          </Link>
        </Button>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Edit user</CardTitle>
                <CardDescription className="mt-1">{user.email}</CardDescription>
              </div>
              <UserStatusPill user={user} />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="border-pass-border bg-pass-bg text-pass-ink">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="user-name">Full name</Label>
              <Input
                id="user-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email address</Label>
              <Input
                id="user-email"
                value={user.email}
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Email addresses are immutable and used for authentication.
              </p>
            </div>

            {canEditRoleAndSite ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Role</Label>
                  <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                    <SelectTrigger id="user-role" className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="MANAGER">Site Manager</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldErrors.role && (
                    <p className="text-xs text-destructive">{fieldErrors.role[0]}</p>
                  )}
                </div>

                {showSiteSelect && (
                  <div className="space-y-1.5">
                    <Label htmlFor="user-site">Site</Label>
                    <Select value={siteId} onValueChange={(val) => setSiteId(val)}>
                      <SelectTrigger id="user-site" className="w-full">
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.siteId && (
                      <p className="text-xs text-destructive">{fieldErrors.siteId[0]}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs font-medium">Role</span>
                  <span className="font-medium">
                    {user.role === "STAFF"
                      ? "Staff"
                      : user.role === "MANAGER"
                        ? "Site Manager"
                        : "Administrator"}
                  </span>
                  {isSelf && (
                    <span className="text-xs text-muted-foreground block">
                      (You cannot change your own role)
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs font-medium">Site</span>
                  <span className="font-medium">{user.site?.name ?? "Network wide"}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="user-section">
                Section <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select value={sectionId} onValueChange={(val) => setSectionId(val)}>
                <SelectTrigger id="user-section" className="w-full">
                  <SelectValue placeholder="No assigned section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None / Unassigned</SelectItem>
                  {sections.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-border pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Account Security & Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account security & status</CardTitle>
          <CardDescription>Manage password resets and account activity status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card">
            <div>
              <h4 className="font-semibold text-sm">Reset password</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Generate a new temporary password and force password change on sign-in.
              </p>
            </div>
            <ConfirmAction
              trigger={
                <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0">
                  <KeyRound className="size-4" />
                  <span>Reset password</span>
                </Button>
              }
              title="Reset password"
              description={`Generate a new temporary password for ${user.name}? Their active sessions will be signed out and they must change the password upon signing in.`}
              confirmLabel="Reset password"
              action={async () => {
                const res = await resetPasswordAction(user.id);
                if (!res.ok) {
                  return { ok: false, error: res.error ?? "Failed to reset password." };
                }
                if (res.temporaryPassword) {
                  setTemporaryPassword(res.temporaryPassword);
                }
                return { ok: true };
              }}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card">
            <div>
              <h4 className="font-semibold text-sm">
                {user.isActive ? "Deactivate account" : "Reactivate account"}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {user.isActive
                  ? `Deactivating will sign out ${user.name} and cancel ${upcomingCount} upcoming booking${upcomingCount === 1 ? "" : "s"}.`
                  : `Reactivating restores login access and booking privileges for ${user.name}.`}
              </p>
            </div>

            {isSelf ? (
              <p className="text-xs text-muted-foreground italic shrink-0">
                You cannot deactivate your own account.
              </p>
            ) : user.isActive ? (
              <ConfirmAction
                trigger={
                  <Button type="button" variant="destructive" size="sm" className="gap-2 shrink-0">
                    <UserMinus className="size-4" />
                    <span>Deactivate</span>
                  </Button>
                }
                title={`Deactivate ${user.name}?`}
                description={`Deactivate ${user.name}? They are signed out at once and ${bookingText} cancelled.`}
                confirmLabel="Deactivate account"
                isDestructive
                action={async () => {
                  const res = await setActiveAction(user.id, false);
                  if (!res.ok) {
                    return { ok: false, error: res.error ?? "Failed to deactivate user." };
                  }
                  router.refresh();
                  return { ok: true };
                }}
              />
            ) : (
              <ConfirmAction
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0 border-pass-border text-pass hover:bg-pass-bg"
                  >
                    <UserCheck className="size-4" />
                    <span>Reactivate</span>
                  </Button>
                }
                title={`Reactivate ${user.name}?`}
                description={`Reactivate ${user.name}? They will be able to sign in and make bookings again.`}
                confirmLabel="Reactivate account"
                action={async () => {
                  const res = await setActiveAction(user.id, true);
                  if (!res.ok) {
                    return { ok: false, error: res.error ?? "Failed to reactivate user." };
                  }
                  router.refresh();
                  return { ok: true };
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
