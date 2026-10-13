"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { TemporaryPasswordPanel } from "@/components/users/temporary-password-panel";
import { createUserAction, type UserActionResult } from "@/actions/users";
import type { Role } from "@/generated/prisma/client";

interface UserCreateDialogProps {
  actorRole: Role;
  actorSiteId: string | null;
  actorSiteName?: string | null;
  allowedRoles: Role[];
  sites: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
  trigger?: React.ReactNode;
}

export function UserCreateDialog({
  actorRole,
  actorSiteId,
  actorSiteName,
  allowedRoles,
  sites,
  sections,
  trigger,
}: UserCreateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>(allowedRoles[0] ?? "STAFF");
  const [siteId, setSiteId] = React.useState<string>(actorSiteId ?? sites[0]?.id ?? "");
  const [sectionId, setSectionId] = React.useState<string>("none");

  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [createdResult, setCreatedResult] = React.useState<{
    name: string;
    email: string;
    temporaryPassword: string;
    emailSent?: boolean;
    emailError?: string;
  } | null>(null);

  const isAdmin = actorRole === "ADMIN";
  const showSiteSelect = isAdmin && role !== "ADMIN";

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      if (createdResult) {
        router.refresh();
      }
      setName("");
      setEmail("");
      setRole(allowedRoles[0] ?? "STAFF");
      setSiteId(actorSiteId ?? sites[0]?.id ?? "");
      setSectionId("none");
      setError(null);
      setFieldErrors({});
      setCreatedResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("role", role);
    if (showSiteSelect) {
      formData.set("siteId", siteId);
    } else if (!isAdmin && actorSiteId) {
      formData.set("siteId", actorSiteId);
    }
    if (sectionId && sectionId !== "none") {
      formData.set("sectionId", sectionId);
    }

    const result: UserActionResult = await createUserAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to create user.");
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    if (result.temporaryPassword) {
      setCreatedResult({
        name,
        email: result.userEmail ?? email,
        temporaryPassword: result.temporaryPassword,
        emailSent: result.emailSent,
        emailError: result.emailError,
      });
      router.refresh();
    }
  };

  const handleAddAnother = () => {
    setName("");
    setEmail("");
    setRole(allowedRoles[0] ?? "STAFF");
    setSiteId(actorSiteId ?? sites[0]?.id ?? "");
    setSectionId("none");
    setError(null);
    setFieldErrors({});
    setCreatedResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="gap-2">
            <UserPlus className="size-4" />
            <span>Add user</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        {createdResult ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Account created</DialogTitle>
              <DialogDescription>A new user account has been provisioned.</DialogDescription>
            </DialogHeader>

            <TemporaryPasswordPanel
              userName={createdResult.name}
              userEmail={createdResult.email}
              temporaryPassword={createdResult.temporaryPassword}
              emailSent={createdResult.emailSent}
              emailError={createdResult.emailError}
              onAddAnother={handleAddAnother}
            />

            <DialogFooter className="pt-2">
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add user</DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? "Provision a new staff, manager, or administrator account."
                  : `Add a new staff member for ${actorSiteName ?? "your site"}.`}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="create-user-name">Full name</Label>
                <Input
                  id="create-user-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kasun Silva"
                  required
                  minLength={2}
                  maxLength={80}
                  autoFocus
                />
                {fieldErrors.name && (
                  <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-user-email">Email address</Label>
                <Input
                  id="create-user-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. kasun.silva@lab.example"
                  required
                />
                {fieldErrors.email && (
                  <p className="text-xs text-destructive">{fieldErrors.email[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-user-role">Role</Label>
                  <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                    <SelectTrigger id="create-user-role" className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r === "STAFF"
                            ? "Staff"
                            : r === "MANAGER"
                              ? "Site Manager"
                              : "Administrator"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {showSiteSelect && (
                  <div className="space-y-1.5">
                    <Label htmlFor="create-user-site">Site</Label>
                    <Select value={siteId} onValueChange={(val) => setSiteId(val)}>
                      <SelectTrigger id="create-user-site" className="w-full">
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

              <div className="space-y-1.5">
                <Label htmlFor="create-user-section">
                  Section <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Select value={sectionId} onValueChange={(val) => setSectionId(val)}>
                  <SelectTrigger id="create-user-section" className="w-full">
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
                {isPending ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
