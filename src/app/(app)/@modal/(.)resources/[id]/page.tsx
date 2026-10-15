import * as React from "react";
import { requireUser } from "@/lib/auth";
import ResourceDetailPage from "@/app/(app)/resources/[id]/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  return (
    <ModalDialog maxWidth="4xl">
      <ResourceDetailPage params={params} />
    </ModalDialog>
  );
}
