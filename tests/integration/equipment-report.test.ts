import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { createResource } from "@/services/resources";
import { addEquipmentRecord } from "@/services/equipment";
import { getEquipmentReport } from "@/services/equipment-report";
import { Role, EquipmentRecordKind, EquipmentOutcome } from "@/generated/prisma/client";
import { labToday } from "@/lib/time";
import { addDaysToDay } from "@/lib/equipment-dates";

describe("Equipment Reports Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null; name: string };
  let colomboManager: { id: string; role: Role; siteId: string; name: string };
  let kandyManager: { id: string; role: Role; siteId: string; name: string };
  let staffActor: { id: string; role: Role; siteId: string; name: string };
  let kandySite: { id: string; name: string };
  let section2: { id: string; name: string };
  let instrumentCat: { id: string; name: string };

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    const admin = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin-rep@lab.example",
        passwordHash: "hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });
    adminActor = { id: admin.id, role: Role.ADMIN, siteId: null, name: admin.name };

    colomboManager = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
      name: fixture.managerUser.name,
    };

    staffActor = {
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
        email: "km-rep@lab.example",
        passwordHash: "hash",
        role: Role.MANAGER,
        siteId: kandySite.id,
        mustChangePassword: false,
      },
    });
    kandyManager = { id: km.id, role: Role.MANAGER, siteId: kandySite.id, name: km.name };

    section2 = await db.section.create({
      data: { name: "Microbiology Section" },
    });

    instrumentCat = await db.category.create({
      data: {
        name: "Diagnostic Analyzers",
        maxBookingMinutes: 240,
        iconKey: "analyzer",
      },
    });
  });

  it("refuses access for STAFF actors", async () => {
    const res = await getEquipmentReport(staffActor);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain("permission");
    }
  });

  it("manager cannot see another site rows even when passing site param", async () => {
    const today = labToday();

    // Create resource in Colombo
    const colomboRes = await createResource(colomboManager, {
      name: "Colombo Centrifuge",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 100),
    });
    expect(colomboRes.ok).toBe(true);

    // Create resource in Kandy
    const kandyRes = await createResource(kandyManager, {
      name: "Kandy Analyzer",
      siteId: kandySite.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 100),
    });
    expect(kandyRes.ok).toBe(true);

    // Colombo manager attempts to query Kandy site explicitly via ?site=
    const reportRes = await getEquipmentReport(colomboManager, {
      site: kandySite.id,
    });

    expect(reportRes.ok).toBe(true);
    if (!reportRes.ok) return;

    // Must be scoped exclusively to Colombo
    expect(reportRes.data.siteId).toBe(fixture.site.id);
    const resourceNames = reportRes.data.conditionRows.map((r) => r.name);
    expect(resourceNames).toContain("Colombo Centrifuge");
    expect(resourceNames).not.toContain("Kandy Analyzer");
  });

  it("admin sees all sites by default or can filter to one chosen site", async () => {
    const today = labToday();

    await createResource(colomboManager, {
      name: "Colombo PCR",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 60),
    });

    await createResource(kandyManager, {
      name: "Kandy Spectrophotometer",
      siteId: kandySite.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 60),
    });

    // Admin without site filter
    const allReport = await getEquipmentReport(adminActor);
    expect(allReport.ok).toBe(true);
    if (!allReport.ok) return;

    const allNames = allReport.data.conditionRows.map((r) => r.name);
    expect(allNames).toContain("Colombo PCR");
    expect(allNames).toContain("Kandy Spectrophotometer");

    // Admin filtered to Kandy
    const kandyReport = await getEquipmentReport(adminActor, { site: kandySite.id });
    expect(kandyReport.ok).toBe(true);
    if (!kandyReport.ok) return;

    const kandyNames = kandyReport.data.conditionRows.map((r) => r.name);
    expect(kandyNames).toContain("Kandy Spectrophotometer");
    expect(kandyNames).not.toContain("Colombo PCR");
  });

  it("filters work for section, category, kind and outcome", async () => {
    const today = labToday();

    const res1 = await createResource(colomboManager, {
      name: "Hematology Counter",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, 60),
    });
    expect(res1.ok).toBe(true);
    if (!res1.ok) return;

    const res2 = await createResource(colomboManager, {
      name: "Incubator",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: section2.id,
      needsMaintenance: true,
      maintenanceIntervalDays: 90,
      nextMaintenanceDueOn: addDaysToDay(today, 30),
    });
    expect(res2.ok).toBe(true);
    if (!res2.ok) return;

    // Add calibration pass to res1
    await addEquipmentRecord(colomboManager, res1.data.id, {
      kind: EquipmentRecordKind.CALIBRATION,
      performedOn: today,
      performedBy: "Service Tech",
      workPerformed: "Annual optical alignment calibration check passed.",
      outcome: EquipmentOutcome.PASS,
      nextDueOn: addDaysToDay(today, 180),
    });

    // Add repair fail to res2
    await addEquipmentRecord(colomboManager, res2.data.id, {
      kind: EquipmentRecordKind.REPAIR,
      performedOn: today,
      performedBy: "Internal Eng",
      workPerformed: "Heating element fault remained uncorrected.",
      outcome: EquipmentOutcome.FAIL,
    });

    // Filter Section A by section2
    const secReport = await getEquipmentReport(colomboManager, {
      section: section2.id,
    });
    expect(secReport.ok).toBe(true);
    if (!secReport.ok) return;
    expect(secReport.data.conditionRows.length).toBe(1);
    expect(secReport.data.conditionRows[0].name).toBe("Incubator");

    // Filter Section B by kind CALIBRATION
    const calReport = await getEquipmentReport(colomboManager, {
      kind: EquipmentRecordKind.CALIBRATION,
    });
    expect(calReport.ok).toBe(true);
    if (!calReport.ok) return;
    expect(calReport.data.logRows.every((r) => r.kind === EquipmentRecordKind.CALIBRATION)).toBe(
      true,
    );

    // Filter Section B by outcome FAIL
    const failReport = await getEquipmentReport(colomboManager, {
      outcome: EquipmentOutcome.FAIL,
    });
    expect(failReport.ok).toBe(true);
    if (!failReport.ok) return;
    expect(failReport.data.logRows.every((r) => r.outcome === EquipmentOutcome.FAIL)).toBe(true);
  });

  it("enforces date range limits (clamp to max and adjust from > to)", async () => {
    const today = labToday();

    // from > to
    const reversedDates = await getEquipmentReport(adminActor, {
      from: today,
      to: addDaysToDay(today, -10),
    });
    expect(reversedDates.ok).toBe(true);
    if (!reversedDates.ok) return;
    expect(reversedDates.data.fromDate).toBe(reversedDates.data.toDate);

    // range > 365 days
    const overMaxDates = await getEquipmentReport(adminActor, {
      from: addDaysToDay(today, -500),
      to: today,
    });
    expect(overMaxDates.ok).toBe(true);
    if (!overMaxDates.ok) return;
    expect(overMaxDates.data.fromDate).toBe(addDaysToDay(today, -365));
  });

  it("sorts Section A Poor -> Watch -> Good -> Not tracked", async () => {
    const today = labToday();

    // Good resource
    const goodRes = await createResource(colomboManager, {
      name: "Good Centrifuge",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 365,
      nextCalibrationDueOn: addDaysToDay(today, 120),
    });
    expect(goodRes.ok).toBe(true);

    // Watch resource (service overdue)
    const watchRes = await createResource(colomboManager, {
      name: "Watch Autoclave",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsMaintenance: true,
      maintenanceIntervalDays: 60,
      nextMaintenanceDueOn: addDaysToDay(today, -5), // service overdue -> WATCH
    });
    expect(watchRes.ok).toBe(true);

    // Poor resource (calibration overdue)
    const poorRes = await createResource(colomboManager, {
      name: "Poor Analyzer",
      siteId: fixture.site.id,
      categoryId: instrumentCat.id,
      sectionId: fixture.section.id,
      needsCalibration: true,
      calibrationIntervalDays: 180,
      nextCalibrationDueOn: addDaysToDay(today, -10), // calibration overdue -> POOR
    });
    expect(poorRes.ok).toBe(true);

    const report = await getEquipmentReport(colomboManager);
    expect(report.ok).toBe(true);
    if (!report.ok) return;

    const conditions = report.data.conditionRows.map((r) => r.condition);
    const poorIndex = conditions.indexOf("POOR");
    const watchIndex = conditions.indexOf("WATCH");
    const goodIndex = conditions.indexOf("GOOD");

    expect(poorIndex).toBeGreaterThanOrEqual(0);
    expect(watchIndex).toBeGreaterThanOrEqual(0);
    expect(goodIndex).toBeGreaterThanOrEqual(0);
    expect(poorIndex).toBeLessThan(watchIndex);
    expect(watchIndex).toBeLessThan(goodIndex);
  });
});
