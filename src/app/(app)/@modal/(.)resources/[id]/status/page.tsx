import * as React from "react";
import { requireRole } from "@/lib/auth";
import ResourceStatusPage from "@/app/(app)/resources/[id]/status/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedResourceStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER", "ADMIN");
  return (
    <ModalDialog maxWidth="2xl">
      <ResourceStatusPage params={params} />
    </ModalDialog>
  );
}
