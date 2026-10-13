"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, UserMinus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface UserEditDialogProps {
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
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UserEditDialog({
  user,
  actorId,
  actorRole,
  upcomingBookingsCount,
  sites,
  sections,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UserEditDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }
  };

  const [name, setName] = React.useState(user.name);
  const [role, setRole] = React.useState<Role>(user.role);
  const [siteId, setSiteId] = React.useState<string>(user.siteId ?? sites[0]?.id ?? "");
  const [sectionId, setSectionId] = React.useState<string>(user.sectionId ?? "none");

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [temporaryPassword, setTemporaryPassword] = React.useState<string | null>(null);

  const isAdmin = actorRole === "ADMIN";
  const isSelf = actorId === user.id;
  const canEditRoleAndSite = isAdmin && !isSelf;
  const showSiteSelect = canEditRoleAndSite && role !== "ADMIN";

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(user.name);
      setRole(user.role);
      setSiteId(user.siteId ?? sites[0]?.id ?? "");
      setSectionId(user.sectionId ?? "none");
      setError(null);
      setFieldErrors({});
      setTemporaryPassword(null);
    } else {
      if (temporaryPassword) {
        router.refresh();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
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

    toast.success("User details updated");
    setOpen(false);
    router.refresh();
  };

  const bookingText =
    upcomingBookingsCount === 1
      ? "their 1 upcoming booking is"
      : `their ${upcomingBookingsCount} upcoming bookings are`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        {temporaryPassword ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>New temporary password</DialogTitle>
              <DialogDescription>
                A new temporary password was generated for {user.name}.
              </DialogDescription>
            </DialogHeader>

            <TemporaryPasswordPanel
              userName={user.name}
              temporaryPassword={temporaryPassword}
              title="Temporary password generated"
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                onClick={() => {
                  setTemporaryPassword(null);
                  setOpen(false);
                  router.refresh();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <div className="flex items-start justify-between gap-3 pr-6">
                <div>
                  <DialogTitle>Edit user</DialogTitle>
                  <DialogDescription className="mt-1">{user.email}</DialogDescription>
                </div>
                <UserStatusPill user={user} />
              </div>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor={`edit-user-name-${user.id}`}>Full name</Label>
                <Input
                  id={`edit-user-name-${user.id}`}
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
                <Label htmlFor={`edit-user-email-${user.id}`}>Email address</Label>
                <Input
                  id={`edit-user-email-${user.id}`}
                  value={user.email}
                  disabled
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>

              {canEditRoleAndSite ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={`edit-user-role-${user.id}`}>Role</Label>
                    <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                      <SelectTrigger id={`edit-user-role-${user.id}`} className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="MANAGER">Site Manager</SelectItem>
                        <SelectItem value="ADMIN">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showSiteSelect && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`edit-user-site-${user.id}`}>Site</Label>
                      <Select value={siteId} onValueChange={(val) => setSiteId(val)}>
                        <SelectTrigger id={`edit-user-site-${user.id}`} className="w-full">
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/40 p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-muted-foreground block text-xs font-medium">Role</span>
                    <span className="font-medium">
                      {user.role === "STAFF"
                        ? "Staff"
                        : user.role === "MANAGER"
                          ? "Site Manager"
                          : "Administrator"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs font-medium">Site</span>
                    <span className="font-medium">{user.site?.name ?? "Network wide"}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor={`edit-user-section-${user.id}`}>
                  Section <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={sectionId} onValueChange={(val) => setSectionId(val)}>
                  <SelectTrigger id={`edit-user-section-${user.id}`} className="w-full">
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

              {/* Security & Action Shortcuts inside Dialog */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Account security & status
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ConfirmAction
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                      >
                        <KeyRound className="size-3.5" />
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

                  {!isSelf && user.isActive && (
                    <ConfirmAction
                      trigger={
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-1.5 text-xs h-8"
                        >
                          <UserMinus className="size-3.5" />
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
                        toast.success("Account deactivated");
                        setOpen(false);
                        router.refresh();
                        return { ok: true };
                      }}
                    />
                  )}

                  {!isSelf && !user.isActive && (
                    <ConfirmAction
                      trigger={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-8 border-pass-border text-pass hover:bg-pass-bg"
                        >
                          <UserCheck className="size-3.5" />
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
                        toast.success("Account reactivated");
                        setOpen(false);
                        router.refresh();
                        return { ok: true };
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
