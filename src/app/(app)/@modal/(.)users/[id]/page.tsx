import * as React from "react";
import { requireRole } from "@/lib/auth";
import UserDetailPage from "@/app/(app)/users/[id]/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MANAGER", "ADMIN");
  return (
    <ModalDialog
      title="User details & edit"
      description="Update profile, permissions, or assigned department."
      maxWidth="2xl"
    >
      <UserDetailPage params={params} />
    </ModalDialog>
  );
}
