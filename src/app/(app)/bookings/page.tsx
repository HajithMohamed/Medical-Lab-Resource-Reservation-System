import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canBook } from "@/lib/permissions";
import { listMyBookings } from "@/services/bookings";
import { db } from "@/lib/db";
import { formatLabRange } from "@/lib/time";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MyBookingsClient, type BookingItem } from "@/components/bookings/my-bookings-client";
import { BookingCreateDialog } from "@/components/bookings/booking-create-dialog";
import type { ResourceOption } from "@/components/bookings/booking-create-form";

export const metadata = {
  title: "My Bookings | BenchBook",
  description: "View and manage your upcoming, past, and cancelled resource reservations.",
};

export default async function BookingsPage() {
  const user = await requireUser();
  if (!canBook(user)) {
    redirect("/bookings/manage");
  }
  const [{ upcoming, past, cancelled }, resources] = await Promise.all([
    listMyBookings(user),
    db.resource.findMany({
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
    }),
  ]);

  const mapWithFormattedRange = (b: (typeof upcoming)[number]): BookingItem => ({
    ...(b as unknown as BookingItem),
    formattedRange: formatLabRange(new Date(b.startAt), new Date(b.endAt)),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace / Bookings"
        title="My bookings"
        description="Your upcoming, past and cancelled reservations across the clinical lab network."
        actions={
          <div className="flex items-center gap-2">
            <BookingCreateDialog
              resources={resources as unknown as ResourceOption[]}
              trigger={
                <Button
                  size="sm"
                  className="bg-gradient-to-br from-teal to-teal-deep text-white font-bold text-xs shadow-xs hover:opacity-95 transition-all"
                >
                  <Plus className="size-3.5 mr-1" />
                  <span>Book a resource</span>
                </Button>
              }
            />
            <Link
              href="/bookings/new"
              className="sr-only focus:not-sr-only text-xs font-bold text-teal"
            >
              Book a resource (page)
            </Link>
          </div>
        }
      />

      <MyBookingsClient
        currentUserId={user.id}
        upcoming={upcoming.map(mapWithFormattedRange)}
        past={past.map(mapWithFormattedRange)}
        cancelled={cancelled.map(mapWithFormattedRange)}
        resources={resources as unknown as ResourceOption[]}
      />
    </div>
  );
}
