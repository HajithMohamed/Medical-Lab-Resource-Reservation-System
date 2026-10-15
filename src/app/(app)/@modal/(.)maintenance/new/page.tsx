import * as React from "react";
import { requireRole } from "@/lib/auth";
import NewMaintenancePage from "@/app/(app)/maintenance/new/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedNewMaintenancePage({
  searchParams,
}: {
  searchParams?: Promise<{
    resourceId?: string;
    siteId?: string;
    breakdown?: string;
    reason?: string;
    returnTo?: string;
  }>;
}) {
  await requireRole("MANAGER", "ADMIN");
  return (
    <ModalDialog maxWidth="2xl">
      <NewMaintenancePage searchParams={searchParams} />
    </ModalDialog>
  );
}
