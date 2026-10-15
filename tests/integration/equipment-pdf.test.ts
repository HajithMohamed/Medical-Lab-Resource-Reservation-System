import { describe, expect, it, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { createResource } from "@/services/resources";
import { addEquipmentRecord } from "@/services/equipment";
import { GET as reportsPdfRoute } from "@/app/(app)/equipment/reports/pdf/route";
import { GET as recordPdfRoute } from "@/app/(app)/equipment/records/[id]/pdf/route";
import { GET as reportsExportRoute } from "@/app/(app)/equipment/reports/export/route";
import * as authModule from "@/lib/auth";
import { Role, EquipmentRecordKind, EquipmentOutcome } from "@/generated/prisma/client";
import { labToday } from "@/lib/time";
import { addDaysToDay } from "@/lib/equipment-dates";

describe("Equipment PDF & CSV Exports (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminUser: { id: string; role: Role; siteId: null; name: string };
  let colomboManager: { id: string; role: Role; siteId: string; name: string };
  let kandyManager: { id: string; role: Role; siteId: string; name: string };
  let staffUser: { id: string; role: Role; siteId: string; name: string };

  let kandySite: { id: string; name: string };
  let instrumentCategory: { id: string; name: string };
  let colomboRecordId: string;
  let kandyRecordId: string;

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    const admin = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin-pdf@lab.example",
        passwordHash: "hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });
    adminUser = { id: admin.id, role: Role.ADMIN, siteId: null, name: admin.name };

    colomboManager = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
      name: fixture.managerUser.name,
    };

    staffUser = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: fixture.staffUser.name,
    };

    kandySite = await db.site.create({
      data: { name: "Kandy Branch Lab" },
    });

    const km = await db.user.create({
      data: {
        name: "Kandy Manager",
        email: "km-pdf@lab.example",
        passwordHash: "hash",
        role: Role.MANAGER,
        siteId: kandySite.id,
        mustChangePassword: false,
      },
    });
    kandyManager = { id: km.id, role: Role.MANAGER, siteId: kandySite.id, name: km.name };

    instrumentCategory = await db.category.create({
      data: {
        name: "Centrifuges",
        maxBookingMinutes: 240,
        iconKey: "centrifuge",
      },
    });

    const today = labToday();

    // Create resource & record in Colombo
    const colomboRes = await createResource(colomboManager, {
      name: "Colombo Precision Centrifuge",
      siteId: fixture.site.id,
      categoryId: instrumentCategory.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 120),
    });
    expect(colomboRes.ok).toBe(true);
    if (!colomboRes.ok) throw new Error(colomboRes.error);

    const recA = await addEquipmentRecord(colomboManager, colomboRes.data.id, {
      kind: EquipmentRecordKind.CALIBRATION,
      performedOn: today,
      performedBy: "Service Eng",
      workPerformed: "Full rotor balancing and optical speed check passed.",
      outcome: EquipmentOutcome.PASS,
      nextDueOn: addDaysToDay(today, 180),
    });
    expect(recA.ok).toBe(true);
    if (!recA.ok) throw new Error(recA.error);
    colomboRecordId = recA.data.record.id;

    // Create resource & record in Kandy
    const kandyRes = await createResource(kandyManager, {
      name: "Kandy High-Speed Centrifuge",
      siteId: kandySite.id,
      categoryId: instrumentCategory.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 120),
    });
    expect(kandyRes.ok).toBe(true);
    if (!kandyRes.ok) throw new Error(kandyRes.error);

    const recB = await addEquipmentRecord(kandyManager, kandyRes.data.id, {
      kind: EquipmentRecordKind.CALIBRATION,
      performedOn: today,
      performedBy: "Kandy Tech",
      workPerformed: "Initial speed verification performed.",
      outcome: EquipmentOutcome.PASS,
      nextDueOn: addDaysToDay(today, 180),
    });
    expect(recB.ok).toBe(true);
    if (!recB.ok) throw new Error(recB.error);
    kandyRecordId = recB.data.record.id;
  });

  function mockUser(u: {
    id: string;
    name: string;
    role: Role;
    siteId: string | null;
  }): authModule.CurrentUser {
    return {
      id: u.id,
      name: u.name,
      email: `${u.id}@example.com`,
      role: u.role,
      siteId: u.siteId,
      siteName: u.siteId ? "Test Site" : null,
      sectionId: null,
      mustChangePassword: false,
    };
  }

  describe("GET /equipment/reports/pdf (Summary Report)", () => {
    it("returns 401 when signed out", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(null);
      const req = new NextRequest("http://localhost:3000/equipment/reports/pdf");
      const res = await reportsPdfRoute(req);
      expect(res.status).toBe(401);
      authSpy.mockRestore();
    });

    it("returns 403 for STAFF", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(mockUser(staffUser));
      const req = new NextRequest("http://localhost:3000/equipment/reports/pdf");
      const res = await reportsPdfRoute(req);
      expect(res.status).toBe(403);
      authSpy.mockRestore();
    });

    it("returns 200 and application/pdf for MANAGER", async () => {
      const authSpy = vi
        .spyOn(authModule, "getCurrentUser")
        .mockResolvedValue(mockUser(colomboManager));
      const req = new NextRequest("http://localhost:3000/equipment/reports/pdf");
      const res = await reportsPdfRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain("equipment-report-");
      expect(disposition).toContain(".pdf");
      authSpy.mockRestore();
    });

    it("returns 200 and application/pdf for ADMIN", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(mockUser(adminUser));
      const req = new NextRequest("http://localhost:3000/equipment/reports/pdf?site=all");
      const res = await reportsPdfRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      authSpy.mockRestore();
    });
  });

  describe("GET /equipment/records/[id]/pdf (Single Service Record Sheet)", () => {
    it("returns 401 when signed out", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(null);
      const req = new NextRequest(`http://localhost:3000/equipment/records/${colomboRecordId}/pdf`);
      const res = await recordPdfRoute(req, { params: Promise.resolve({ id: colomboRecordId }) });
      expect(res.status).toBe(401);
      authSpy.mockRestore();
    });

    it("returns 403 for STAFF", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(mockUser(staffUser));
      const req = new NextRequest(`http://localhost:3000/equipment/records/${colomboRecordId}/pdf`);
      const res = await recordPdfRoute(req, { params: Promise.resolve({ id: colomboRecordId }) });
      expect(res.status).toBe(403);
      authSpy.mockRestore();
    });

    it("returns 404 when record does not exist", async () => {
      const authSpy = vi
        .spyOn(authModule, "getCurrentUser")
        .mockResolvedValue(mockUser(colomboManager));
      const dummyId = "00000000-0000-0000-0000-000000000000";
      const req = new NextRequest(`http://localhost:3000/equipment/records/${dummyId}/pdf`);
      const res = await recordPdfRoute(req, { params: Promise.resolve({ id: dummyId }) });
      expect(res.status).toBe(404);
      authSpy.mockRestore();
    });

    it("returns 404 (not 403) for another site's record id for a manager", async () => {
      // Colombo manager requests Kandy record
      const authSpy = vi
        .spyOn(authModule, "getCurrentUser")
        .mockResolvedValue(mockUser(colomboManager));
      const req = new NextRequest(`http://localhost:3000/equipment/records/${kandyRecordId}/pdf`);
      const res = await recordPdfRoute(req, { params: Promise.resolve({ id: kandyRecordId }) });
      expect(res.status).toBe(404);
      authSpy.mockRestore();
    });

    it("returns 200 and application/pdf for manager on own site's record", async () => {
      const authSpy = vi
        .spyOn(authModule, "getCurrentUser")
        .mockResolvedValue(mockUser(colomboManager));
      const req = new NextRequest(`http://localhost:3000/equipment/records/${colomboRecordId}/pdf`);
      const res = await recordPdfRoute(req, { params: Promise.resolve({ id: colomboRecordId }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain(`service-record-${colomboRecordId}.pdf`);
      authSpy.mockRestore();
    });

    it("returns 200 and application/pdf for admin on any site's record", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(mockUser(adminUser));
      const req = new NextRequest(`http://localhost:3000/equipment/records/${kandyRecordId}/pdf`);
      const res = await recordPdfRoute(req, { params: Promise.resolve({ id: kandyRecordId }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      authSpy.mockRestore();
    });
  });

  describe("GET /equipment/reports/export (CSV Export)", () => {
    it("returns 401 when signed out", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(null);
      const req = new NextRequest("http://localhost:3000/equipment/reports/export");
      const res = await reportsExportRoute(req);
      expect(res.status).toBe(401);
      authSpy.mockRestore();
    });

    it("returns 403 for STAFF", async () => {
      const authSpy = vi.spyOn(authModule, "getCurrentUser").mockResolvedValue(mockUser(staffUser));
      const req = new NextRequest("http://localhost:3000/equipment/reports/export");
      const res = await reportsExportRoute(req);
      expect(res.status).toBe(403);
      authSpy.mockRestore();
    });

    it("returns 200 and text/csv with manager site-isolation", async () => {
      const authSpy = vi
        .spyOn(authModule, "getCurrentUser")
        .mockResolvedValue(mockUser(colomboManager));
      const req = new NextRequest(
        `http://localhost:3000/equipment/reports/export?site=${kandySite.id}`,
      );
      const res = await reportsExportRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/csv");

      const csv = await res.text();
      expect(csv).toContain("Date,Equipment,Site,Section,Type");
      expect(csv).toContain("Colombo Precision Centrifuge");
      expect(csv).not.toContain("Kandy High-Speed Centrifuge");
      authSpy.mockRestore();
    });
  });
});
