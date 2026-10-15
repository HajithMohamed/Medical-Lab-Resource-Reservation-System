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
          <Button className="gap-2 bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-teal">
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

            <DialogFooter className="pt-3 border-t border-line">
              <Button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-teal px-5 py-2"
              >
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

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="create-user-name"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Full name
                </Label>
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
                  <p className="text-xs font-mono text-rose-400">{fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="create-user-email"
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Email address
                </Label>
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
                  <p className="text-xs font-mono text-rose-400">{fieldErrors.email[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="create-user-role"
                    className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                  >
                    Role
                  </Label>
                  <Select value={role} onValueChange={(val) => setRole(val as Role)}>
                    <SelectTrigger
                      id="create-user-role"
                      className="w-full bg-[#060e1d] border-[#334155] text-white"
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18202f] border-[#334155] text-white">
                      {allowedRoles.map((r) => (
                        <SelectItem
                          key={r}
                          value={r}
                          className="hover:bg-[#222a3a] focus:bg-[#222a3a]"
                        >
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
                    <Label
                      htmlFor="create-user-site"
                      className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                    >
                      Site
                    </Label>
                    <Select value={siteId} onValueChange={(val) => setSiteId(val)}>
                      <SelectTrigger
                        id="create-user-site"
                        className="w-full bg-[#060e1d] border-[#334155] text-white"
                      >
                        <SelectValue placeholder="Select site" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#18202f] border-[#334155] text-white">
                        {sites.map((s) => (
                          <SelectItem
                            key={s.id}
                            value={s.id}
                            className="hover:bg-[#222a3a] focus:bg-[#222a3a]"
                          >
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.siteId && (
                      <p className="text-xs font-mono text-rose-400">{fieldErrors.siteId[0]}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="create-user-section"
                    className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                  >
                    Section
                  </Label>
                  <span className="text-xs font-mono text-[#879390]">(optional)</span>
                </div>
                <Select value={sectionId} onValueChange={(val) => setSectionId(val)}>
                  <SelectTrigger
                    id="create-user-section"
                    className="w-full bg-[#060e1d] border-[#334155] text-white"
                  >
                    <SelectValue placeholder="No assigned section" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18202f] border-[#334155] text-white">
                    <SelectItem value="none" className="hover:bg-[#222a3a] focus:bg-[#222a3a]">
                      None / Unassigned
                    </SelectItem>
                    {sections.map((sec) => (
                      <SelectItem
                        key={sec.id}
                        value={sec.id}
                        className="hover:bg-[#222a3a] focus:bg-[#222a3a]"
                      >
                        {sec.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-line">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
                className="rounded-xl border-card-edge bg-card text-navy font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs rounded-xl shadow-teal px-5 py-2"
              >
                {isPending ? "Creating..." : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
