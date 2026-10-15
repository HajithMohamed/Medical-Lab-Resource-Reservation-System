import * as React from "react";
import { requireUser } from "@/lib/auth";
import NewBookingPage from "@/app/(app)/bookings/new/page";
import { ModalDialog } from "@/components/modal-dialog";

export default async function InterceptedNewBookingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    resourceId?: string;
    date?: string;
    start?: string;
    end?: string;
  }>;
}) {
  await requireUser();
  return (
    <ModalDialog maxWidth="2xl">
      <NewBookingPage searchParams={searchParams} />
    </ModalDialog>
  );
}
