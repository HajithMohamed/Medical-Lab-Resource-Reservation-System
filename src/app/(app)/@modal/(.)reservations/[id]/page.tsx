import * as React from "react";
import { requireUser } from "@/lib/auth";
import ReservationPage from "@/app/(app)/reservations/[id]/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  return (
    <ModalDialog maxWidth="3xl">
      <ReservationPage params={params} />
    </ModalDialog>
  );
}
