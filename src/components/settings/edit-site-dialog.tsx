"use client";

import * as React from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateSiteAction, type ActionResult } from "@/actions/settings";
import type { SiteWithCounts } from "@/services/settings";

interface EditSiteDialogProps {
  site: SiteWithCounts;
  trigger?: React.ReactNode;
}

export function EditSiteDialog({ site, trigger }: EditSiteDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState(site.name);
  const [address, setAddress] = React.useState(site.address ?? "");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(site.name);
      setAddress(site.address ?? "");
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("address", address);

    const result: ActionResult = await updateSiteAction(site.id, null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to save changes.");
      return;
    }

    toast.success(result.message ?? "Changes saved");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#18202f] hover:bg-[#222a3a] text-xs font-mono font-medium text-[#dbe2f8] hover:text-white border border-[#334155] hover:border-[#6cd8cb]/50 transition-all duration-150 active:scale-[0.98]"
          >
            <Pencil className="size-3.5 text-[#6cd8cb]" />
            <span>Edit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit site</DialogTitle>
            <DialogDescription>
              Update name and physical address for this laboratory site.
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
                htmlFor={`edit-site-name-${site.id}`}
                className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
              >
                Site Name
              </Label>
              <Input
                id={`edit-site-name-${site.id}`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Laboratory, Colombo"
                required
                minLength={2}
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={`edit-site-address-${site.id}`}
                  className="text-xs font-mono uppercase tracking-wider text-[#bcc9c6]"
                >
                  Address
                </Label>
                <span className="text-xs font-mono text-[#879390]">(optional)</span>
              </div>
              <Input
                id={`edit-site-address-${site.id}`}
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Colombo 07"
                maxLength={200}
              />
            </div>

            {/* Telemetry Stats Callout */}
            <div className="p-3 bg-[#18202f] border border-[#334155]/60 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-[#6cd8cb]">ℹ</span>
                <span className="text-xs text-[#94a3b8] font-mono">
                  Associated with{" "}
                  <strong className="text-white font-semibold">
                    {site._count.resources} resources
                  </strong>{" "}
                  and{" "}
                  <strong className="text-white font-semibold">{site._count.users} users</strong>.
                </span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Operational
              </span>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[#334155]/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-[#dbe2f8] hover:bg-[#222a3a]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono px-5 py-2 rounded-lg transition-all duration-150 active:scale-[0.98]"
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
