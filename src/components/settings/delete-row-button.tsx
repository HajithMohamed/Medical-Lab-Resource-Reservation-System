"use client";

import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/confirm-action";

interface DeleteRowButtonProps {
  id: string;
  name: string;
  entityType: "site" | "section" | "category";
  deleteAction: (id: string) => Promise<{ ok: boolean; message?: string; error?: string }>;
}

export function DeleteRowButton({ id, name, entityType, deleteAction }: DeleteRowButtonProps) {
  const handleDelete = async () => {
    const res = await deleteAction(id);
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    toast.success(
      res.message ?? `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} deleted`,
    );
    return { ok: true };
  };

  return (
    <ConfirmAction
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 p-0 rounded text-[#94a3b8] hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors duration-150 active:scale-95"
        >
          <Trash2 className="size-3.5" />
          <span className="sr-only">Delete {name}</span>
        </Button>
      }
      title={`Delete ${entityType}`}
      description={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
      confirmLabel={`Delete ${entityType}`}
      isDestructive
      action={handleDelete}
    />
  );
}
