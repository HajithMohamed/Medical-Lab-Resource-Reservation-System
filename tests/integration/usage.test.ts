import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { getUsage } from "@/services/usage";
import { GET as exportRoute } from "@/app/(app)/usage/export/route";
import {
  Role,
  ReservationKind,
  ReservationStatus,
  ResourceStatus,
} from "@/generated/prisma/client";
import { parseLabDateTime } from "@/lib/time";
import * as authModule from "@/lib/auth";

describe("Usage Service & Dashboard (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null; name: string };
  let managerA: { id: string; role: Role; siteId: string; name: string };
  let staffA: { id: string; role: Role; siteId: string; name: string };

  let siteB: { id: string; name: string };
  let managerB: { id: string; role: Role; siteId: string; name: string };
  let resourceB: { id: string; name: string; siteId: string };

  const ZONE = "Asia/Colombo";

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    managerA = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
      name: fixture.managerUser.name,
    };

    staffA = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: fixture.staffUser.name,
    };

    const adminUser = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });
    adminActor = {
      id: adminUser.id,
      role: Role.ADMIN,
      siteId: null,
      name: adminUser.name,
    };

    // Site B (Kandy)
    siteB = await db.site.create({
      data: { name: "Kandy Laboratory" },
    });

    const mgrB = await db.user.create({
      data: {
        name: "Ruwan Jayasinghe",
        email: "ruwan.kandy@lab.example",
        passwordHash: "test-hash",
        role: Role.MANAGER,
        siteId: siteB.id,
        mustChangePassword: false,
      },
    });
    managerB = {
      id: mgrB.id,
      role: Role.MANAGER,
      siteId: siteB.id,
      name: mgrB.name,
    };

    const resB = await db.resource.create({
      data: {
        name: "Centrifuge Kandy 1",
        siteId: siteB.id,
        categoryId: fixture.category.id,
        sectionId: fixture.section.id,
        status: ResourceStatus.ACTIVE,
      },
    });
    resourceB = {
      id: resB.id,
      name: resB.name,
      siteId: resB.siteId,
    };
  });

  it("refuses access to STAFF with an error message", async () => {
    const result = await getUsage(staffA, {
      from: "2026-10-01",
      to: "2026-10-14",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("access");
    }
  });

  it("MANAGER gets only their own site numbers and scope", async () => {
    const result = await getUsage(managerA, {
      from: "2026-10-01",
      to: "2026-10-14",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.scopeLabel).toBe(fixture.site.name);
    expect(result.data.siteId).toBe(fixture.site.id);

    // Every resource in data.resources belongs to Manager A's site (Colombo)
    expect(result.data.resources.length).toBeGreaterThan(0);
    expect(result.data.resources.every((r) => r.siteId === fixture.site.id)).toBe(true);
    expect(result.data.resources.some((r) => r.siteId === siteB.id)).toBe(false);
  });

  it("MANAGER passing another siteId or 'all' still gets only their own site (R1 isolation)", async () => {
    // 1. Manager passing another site
    const resultOtherSite = await getUsage(managerA, {
      siteId: siteB.id,
      from: "2026-10-01",
      to: "2026-10-14",
    });

    expect(resultOtherSite.ok).toBe(true);
    if (!resultOtherSite.ok) return;
    expect(resultOtherSite.data.scopeLabel).toBe(fixture.site.name);
    expect(resultOtherSite.data.siteId).toBe(fixture.site.id);
    expect(resultOtherSite.data.resources.some((r) => r.siteId === siteB.id)).toBe(false);

    // 2. Manager passing 'all'
    const resultAll = await getUsage(managerA, {
      siteId: "all",
      from: "2026-10-01",
      to: "2026-10-14",
    });

    expect(resultAll.ok).toBe(true);
    if (!resultAll.ok) return;
    expect(resultAll.data.scopeLabel).toBe(fixture.site.name);
    expect(resultAll.data.siteId).toBe(fixture.site.id);

    // 3. Manager B always gets site B
    const resultB = await getUsage(managerB, {
      siteId: fixture.site.id,
      from: "2026-10-01",
      to: "2026-10-14",
    });
    expect(resultB.ok).toBe(true);
    if (!resultB.ok) return;
    expect(resultB.data.scopeLabel).toBe(siteB.name);
    expect(resultB.data.siteId).toBe(siteB.id);
  });

  it("ADMIN with 'all' gets every site and 'All sites' label", async () => {
    const result = await getUsage(adminActor, {
      siteId: "all",
      from: "2026-10-01",
      to: "2026-10-14",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.scopeLabel).toBe("All sites");
    expect(result.data.siteId).toBe("all");

    // Resources from both Colombo and Kandy are present
    expect(result.data.resources.some((r) => r.siteId === fixture.site.id)).toBe(true);
    expect(result.data.resources.some((r) => r.siteId === siteB.id)).toBe(true);
  });

  it("ADMIN with a specific site gets only that site", async () => {
    const result = await getUsage(adminActor, {
      siteId: siteB.id,
      from: "2026-10-01",
      to: "2026-10-14",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.scopeLabel).toBe("Kandy Laboratory");
    expect(result.data.siteId).toBe(siteB.id);

    // Only Kandy resources are present
    expect(result.data.resources.length).toBeGreaterThan(0);
    expect(result.data.resources.every((r) => r.siteId === siteB.id)).toBe(true);
    expect(result.data.resources.some((r) => r.siteId === fixture.site.id)).toBe(false);
  });

  it("computes exact numbers for a known dataset (standard hours, peak, section, maintenance)", async () => {
    const targetDate = "2026-10-14"; // Wednesday (Standard weekday)

    // 1. Confirmed booking in standard hours: 09:00 - 11:00 (2 hrs = 120 mins)
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        startAt: parseLabDateTime(targetDate, "09:00", ZONE),
        endAt: parseLabDateTime(targetDate, "11:00", ZONE),
        purpose: "Routine examination",
      },
    });

    // 2. Confirmed booking outside standard hours: 20:00 - 22:00 (2 hrs = 120 mins)
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CONFIRMED,
        startAt: parseLabDateTime(targetDate, "20:00", ZONE),
        endAt: parseLabDateTime(targetDate, "22:00", ZONE),
        purpose: "Overtime batch processing",
      },
    });

    // 3. Maintenance block: 13:00 - 15:00 (2 hrs = 120 mins)
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: managerA.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        startAt: parseLabDateTime(targetDate, "13:00", ZONE),
        endAt: parseLabDateTime(targetDate, "15:00", ZONE),
        purpose: "Scheduled calibration check",
      },
    });

    // 4. Cancelled booking in period: 15:00 - 16:00
    await db.reservation.create({
      data: {
        resourceId: fixture.resource1.id,
        createdById: fixture.staffUser.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CANCELLED,
        startAt: parseLabDateTime(targetDate, "15:00", ZONE),
        endAt: parseLabDateTime(targetDate, "16:00", ZONE),
        cancelledAt: parseLabDateTime(targetDate, "14:30", ZONE),
        cancelledById: fixture.staffUser.id,
        cancelReason: "Patient sample delayed",
        purpose: "Sample work",
      },
    });

    // Run report for just this 1 day: 2026-10-14
    const result = await getUsage(managerA, {
      from: targetDate,
      to: targetDate,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data;

    // 1 standard day = 10.0 hours (600 mins: 08:00 to 18:00)
    expect(data.standardHoursAvailablePerResource).toBe(10.0);

    // Find resource1 in items
    const r1 = data.resources.find((r) => r.id === fixture.resource1.id);
    expect(r1).toBeDefined();
    if (!r1) return;

    // Standard hours booked = 2.0 h (120 mins from 09:00 to 11:00)
    expect(r1.bookedHoursStandard).toBe(2.0);

    // Total booked hours = 4.0 h (120 mins standard + 120 mins overtime)
    expect(r1.bookedHoursTotal).toBe(4.0);

    // Utilisation = 120 / 600 = 20.0%
    expect(r1.utilisation).toBe(20.0);
    expect(r1.classification).toBe("normal");

    // Totals
    expect(data.totals.totalBookedHours).toBe(4.0);
    expect(data.totals.totalMaintenanceHours).toBe(2.0);
    expect(data.totals.cancelledBookingsCount).toBe(1);

    // Section breakdown
    const sectionItem = data.sections.find((s) => s.section === fixture.section.name);
    expect(sectionItem).toBeDefined();
    expect(sectionItem?.minutes).toBe(240); // 4 hours

    // Peak hours: hours 9, 10, 20, 21 each have 60 mins
    expect(data.peakHours.hourlyMinutes[9]).toBe(60);
    expect(data.peakHours.hourlyMinutes[10]).toBe(60);
    expect(data.peakHours.hourlyMinutes[20]).toBe(60);
    expect(data.peakHours.hourlyMinutes[21]).toBe(60);
  });

  describe("CSV Export Route Handler", () => {
    it("returns 403 when STAFF attempts CSV export", async () => {
      // Mock session as staff
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: staffA.id,
        name: staffA.name,
        email: "staff@example.com",
        role: Role.STAFF,
        siteId: staffA.siteId,
        siteName: "Colombo Central",
        sectionId: null,
        mustChangePassword: false,
      });

      const req = new NextRequest(
        "http://localhost:3000/usage/export?from=2026-10-01&to=2026-10-14",
      );
      const res = await exportRoute(req);
      expect(res.status).toBe(403);

      authSpy.mockRestore();
    });

    it("returns manager CSV containing only their own site resources", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue({
        id: managerA.id,
        name: managerA.name,
        email: "manager@example.com",
        role: Role.MANAGER,
        siteId: managerA.siteId,
        siteName: "Colombo Central",
        sectionId: null,
        mustChangePassword: false,
      });

      const req = new NextRequest(
        `http://localhost:3000/usage/export?from=2026-10-01&to=2026-10-14&site=${siteB.id}`,
      );
      const res = await exportRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");
      const filenameHeader = res.headers.get("Content-Disposition");
      expect(filenameHeader).toContain(".csv");

      const csvText = await res.text();
      expect(csvText).toContain("Resource,Category,Site");
      expect(csvText).toContain(fixture.resource1.name);
      // Even though site=siteB.id was passed, Kandy resource is absent
      expect(csvText).not.toContain(resourceB.name);

      authSpy.mockRestore();
    });
  });
});
