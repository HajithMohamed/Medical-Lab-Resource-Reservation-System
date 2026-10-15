import * as React from "react";
import { requireRole } from "@/lib/auth";
import EditResourcePage from "@/app/(app)/resources/[id]/edit/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedEditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER", "ADMIN");
  return (
    <ModalDialog maxWidth="3xl">
      <EditResourcePage params={params} />
    </ModalDialog>
  );
}
