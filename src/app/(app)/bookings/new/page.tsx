import * as React from "react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingCreateForm, type ResourceOption } from "@/components/bookings/booking-create-form";

export const metadata = {
  title: "Book a Resource | BenchBook",
  description: "Reserve a shared laboratory instrument, cabinet, or clinical room.",
};

interface NewBookingPageProps {
  searchParams?: Promise<{
    resourceId?: string;
    date?: string;
    start?: string;
    end?: string;
  }>;
}

export default async function NewBookingPage({ searchParams }: NewBookingPageProps) {
  await requireUser();
  const resolvedParams = searchParams ? await searchParams : {};

  const resources = await db.resource.findMany({
    where: { status: "ACTIVE" },
    include: {
      site: {
        select: { id: true, name: true },
      },
      category: {
        select: { id: true, name: true, maxBookingMinutes: true, iconKey: true },
      },
    },
    orderBy: [{ site: { name: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="py-4">
      <BookingCreateForm
        resources={resources as unknown as ResourceOption[]}
        prefilled={resolvedParams}
      />
    </div>
  );
}
