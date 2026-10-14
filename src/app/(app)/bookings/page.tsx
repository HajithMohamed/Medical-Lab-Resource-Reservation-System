import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
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
        title="My bookings"
        description="Your upcoming, past and cancelled reservations across the clinical lab network."
        actions={
          <div className="flex items-center gap-2">
            <BookingCreateDialog
              resources={resources as unknown as ResourceOption[]}
              trigger={
                <Button
                  size="sm"
                  className="h-8 gap-1.5 bg-[#6cd8cb] hover:bg-[#29a195] text-[#003732] font-semibold text-xs font-mono active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="size-3.5 stroke-[2.5]" />
                  <span>Book a resource</span>
                </Button>
              }
            />
            {/* Direct fallback link for full page navigation */}
            <Link
              href="/bookings/new"
              className="sr-only focus:not-sr-only text-xs font-mono text-[#6cd8cb]"
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
