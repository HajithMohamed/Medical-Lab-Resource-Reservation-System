"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createSiteAction, type ActionResult } from "@/actions/settings";

export function SiteDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setError(null);
      setName("");
      setAddress("");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("address", address);

    const result: ActionResult = await createSiteAction(null, formData);
    setIsPending(false);

    if (!result.ok) {
      setError(result.error ?? "Failed to add site.");
      return;
    }

    toast.success(result.message ?? "Site added");
    setOpen(false);
    setName("");
    setAddress("");
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-teal hover:bg-teal-deep text-white font-bold text-xs rounded-xl shadow-2xs">
          <Plus className="size-4" />
          <span>Add site</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add site</DialogTitle>
            <DialogDescription>
              Create a new laboratory location or branch in the network.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-name" className="text-xs font-semibold text-navy">
                Site Name
              </Label>
              <Input
                id="site-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Laboratory, Colombo"
                required
                minLength={2}
                maxLength={80}
                autoFocus
                className="h-10 bg-card border-card-edge text-navy text-xs rounded-xl focus-visible:border-teal"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="site-address" className="text-xs font-semibold text-navy">
                  Address
                </Label>
                <span className="text-xs text-muted font-normal">(optional)</span>
              </div>
              <Input
                id="site-address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Colombo 07"
                maxLength={200}
                className="h-10 bg-card border-card-edge text-navy text-xs rounded-xl focus-visible:border-teal"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-card-edge">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-navy hover:bg-mint rounded-xl border-card-edge"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-teal hover:bg-teal-deep text-white font-bold text-xs px-5 py-2 rounded-xl shadow-2xs transition-all active:scale-95"
            >
              {isPending ? "Adding..." : "Add site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
