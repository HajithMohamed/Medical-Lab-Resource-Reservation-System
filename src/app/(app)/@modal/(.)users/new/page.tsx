import * as React from "react";
import { requireRole } from "@/lib/auth";
import NewUserPage from "@/app/(app)/users/new/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedNewUserPage() {
  await requireRole("MANAGER", "ADMIN");
  return (
    <ModalDialog
      title="Add new user"
      description="Provision a new user account with temporary credentials."
      maxWidth="2xl"
    >
      <NewUserPage />
    </ModalDialog>
  );
}
