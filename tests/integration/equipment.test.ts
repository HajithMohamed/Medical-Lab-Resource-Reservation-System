import { describe, expect, it, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { resetDatabase, createTestData } from "../helpers/db";
import { createResource, updateResource, changeStatus } from "@/services/resources";
import {
  addEquipmentRecord,
  markDone,
  markNotDone,
  listTodayTasks,
  getEquipmentHistory,
} from "@/services/equipment";
import {
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
  EquipmentRecordKind,
  EquipmentOutcome,
} from "@/generated/prisma/client";
import { labToday } from "@/lib/time";
import { addDaysToDay, dayToDb } from "@/lib/equipment-dates";

describe("Equipment Care Service (Integration)", () => {
  let fixture: Awaited<ReturnType<typeof createTestData>>;
  let adminActor: { id: string; role: Role; siteId: null; name: string };
  let colomboManager: { id: string; role: Role; siteId: string; name: string };
  let staffActor: { id: string; role: Role; siteId: string; name: string };
  let kandySite: { id: string; name: string };
  let kandyManager: { id: string; role: Role; siteId: string; name: string };

  let instrumentCategory: { id: string; name: string };
  let roomCategory: { id: string; name: string };
  let vehicleCategory: { id: string; name: string };

  beforeEach(async () => {
    await resetDatabase();
    fixture = await createTestData();

    // Admin user
    const admin = await db.user.create({
      data: {
        name: "Test Admin",
        email: "admin@lab.example",
        passwordHash: "test-hash",
        role: Role.ADMIN,
        mustChangePassword: false,
      },
    });
    adminActor = { id: admin.id, role: Role.ADMIN, siteId: null, name: admin.name };

    // Colombo manager
    colomboManager = {
      id: fixture.managerUser.id,
      role: Role.MANAGER,
      siteId: fixture.site.id,
      name: fixture.managerUser.name,
    };

    // Staff actor
    staffActor = {
      id: fixture.staffUser.id,
      role: Role.STAFF,
      siteId: fixture.site.id,
      name: fixture.staffUser.name,
    };

    // Kandy site & manager
    kandySite = await db.site.create({
      data: {
        name: "Kandy Branch Laboratory",
        address: "45 Peradeniya Road, Kandy",
      },
    });

    const km = await db.user.create({
      data: {
        name: "Kandy Manager",
        email: "kandy.manager@lab.example",
        passwordHash: "test-hash",
        role: Role.MANAGER,
        siteId: kandySite.id,
        mustChangePassword: false,
      },
    });
    kandyManager = { id: km.id, role: Role.MANAGER, siteId: kandySite.id, name: km.name };

    // Categories
    instrumentCategory = await db.category.create({
      data: {
        name: "Molecular Instruments",
        maxBookingMinutes: 240,
        iconKey: "centrifuge",
      },
    });

    roomCategory = await db.category.create({
      data: {
        name: "Conference Rooms",
        maxBookingMinutes: 480,
        iconKey: "room",
      },
    });

    vehicleCategory = await db.category.create({
      data: {
        name: "Transport Vans",
        maxBookingMinutes: 600,
        iconKey: "vehicle",
      },
    });
  });

  describe("Resource Creation with Equipment Care", () => {
    it("creates a resource with equipment details and last calibrated on -> creates resource + one CALIBRATION PASS record in one transaction", async () => {
      const today = labToday();
      const lastCalibratedOn = addDaysToDay(today, -30);
      const nextCalibrationDueOn = addDaysToDay(today, 335);

      const res = await createResource(colomboManager, {
        name: "Thermal Cycler 1",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        manufacturer: "Applied Biosystems",
        model: "ProFlex 96",
        serialNumber: "SN-998877",
        inServiceOn: addDaysToDay(today, -60),
        expectedServiceLifeYears: 10,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        lastCalibratedOn,
        calibratedBy: "Calibration Services Ltd",
        calibrationReference: "CERT-2026-001",
        nextCalibrationDueOn,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.data.name).toBe("Thermal Cycler 1");
      expect(res.data.manufacturer).toBe("Applied Biosystems");
      expect(res.data.serialNumber).toBe("SN-998877");
      expect(res.data.calibrationIntervalDays).toBe(365);

      // Verify the equipment_records table has exactly 1 initial record
      const history = await getEquipmentHistory(res.data.id);
      expect(history.ok).toBe(true);
      if (!history.ok) return;
      expect(history.data).toHaveLength(1);
      expect(history.data[0].kind).toBe(EquipmentRecordKind.CALIBRATION);
      expect(history.data[0].outcome).toBe(EquipmentOutcome.PASS);
      expect(history.data[0].notes).toBe("Entered when the resource was registered");
      expect(history.data[0].performedBy).toBe("Calibration Services Ltd");
      expect(history.data[0].reference).toBe("CERT-2026-001");
      expect(history.data[0].recordedById).toBe(colomboManager.id);
    });

    it("creates a resource without last calibrated on -> creates 0 equipment records", async () => {
      const today = labToday();
      const nextDue = addDaysToDay(today, 180);

      const res = await createResource(colomboManager, {
        name: "New Analytical Balance",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        manufacturer: "Mettler Toledo",
        model: "ME204",
        serialNumber: "BAL-001",
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: nextDue,
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const history = await getEquipmentHistory(res.data.id);
      expect(history.ok).toBe(true);
      if (history.ok) {
        expect(history.data).toHaveLength(0);
      }
    });

    it("refuses creation when calibration is enabled but interval or next due date is missing", async () => {
      const res = await createResource(colomboManager, {
        name: "Broken Config Balance",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        // Missing calibrationIntervalDays and nextCalibrationDueOn
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("Enter the interval and the next due date");
      }
    });

    it("category 'room' saves no equipment fields or schedules even if passed", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Meeting Room Gamma",
        siteId: fixture.site.id,
        categoryId: roomCategory.id,
        sectionId: fixture.section.id,
        capacity: 25,
        manufacturer: "Furniture Maker",
        model: "Conf-1",
        serialNumber: "SN-ROOM-1",
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: addDaysToDay(today, 180),
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      // Stored record in db should have nulls for equipment fields
      const stored = await db.resource.findUnique({
        where: { id: res.data.id },
      });
      expect(stored?.capacity).toBe(25);
      expect(stored?.manufacturer).toBeNull();
      expect(stored?.model).toBeNull();
      expect(stored?.serialNumber).toBeNull();
      expect(stored?.calibrationIntervalDays).toBeNull();
      expect(stored?.nextCalibrationDueOn).toBeNull();

      const history = await getEquipmentHistory(res.data.id);
      expect(history.ok && history.data.length).toBe(0);
    });

    it("category 'transport' (vehicle) ignores calibration fields but saves vehicle details and maintenance", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Mobile Collection Van 1",
        siteId: fixture.site.id,
        categoryId: vehicleCategory.id,
        sectionId: fixture.section.id,
        manufacturer: "Toyota",
        model: "HiAce",
        serialNumber: "WP-CAB-1234",
        needsCalibration: true, // Should be ignored for vehicles
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDaysToDay(today, 365),
        needsMaintenance: true,
        maintenanceIntervalDays: 90,
        nextMaintenanceDueOn: addDaysToDay(today, 90),
      });

      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const stored = await db.resource.findUnique({
        where: { id: res.data.id },
      });
      expect(stored?.manufacturer).toBe("Toyota");
      expect(stored?.serialNumber).toBe("WP-CAB-1234");
      expect(stored?.calibrationIntervalDays).toBeNull();
      expect(stored?.nextCalibrationDueOn).toBeNull();
      expect(stored?.maintenanceIntervalDays).toBe(90);
      expect(stored?.nextMaintenanceDueOn).not.toBeNull();
    });
  });

  describe("Resource Update & Role Checks", () => {
    it("updateResource changes fields and schedule but adds NO record to equipment_records", async () => {
      const today = labToday();
      const createRes = await createResource(colomboManager, {
        name: "Microscope Alpha",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        manufacturer: "Olympus",
        model: "CX23",
        serialNumber: "SN-OLY-01",
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDaysToDay(today, 200),
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const newDue = addDaysToDay(today, 250);
      const updateRes = await updateResource(colomboManager, createRes.data.id, {
        name: "Microscope Alpha Updated",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        manufacturer: "Olympus Corp",
        model: "CX23-Upgraded",
        serialNumber: "SN-OLY-01-A",
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: newDue,
      });

      expect(updateRes.ok).toBe(true);
      if (!updateRes.ok) return;

      expect(updateRes.data.manufacturer).toBe("Olympus Corp");
      expect(updateRes.data.calibrationIntervalDays).toBe(180);

      // Verify no records added
      const history = await getEquipmentHistory(createRes.data.id);
      expect(history.ok && history.data.length).toBe(0);
    });

    it("manager of another site and staff cannot create, edit, or record equipment care", async () => {
      const today = labToday();

      // Colombo manager creating in Colombo
      const createRes = await createResource(colomboManager, {
        name: "Protected Fluorometer",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDaysToDay(today, 100),
      });
      expect(createRes.ok).toBe(true);
      if (!createRes.ok) return;

      const resourceId = createRes.data.id;

      // 1. Kandy manager cannot edit Colombo resource
      const editOther = await updateResource(kandyManager, resourceId, {
        name: "Tampered Name",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
      });
      expect(editOther.ok).toBe(false);

      // 2. Staff cannot edit Colombo resource
      const editStaff = await updateResource(staffActor, resourceId, {
        name: "Staff Tampered Name",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
      });
      expect(editStaff.ok).toBe(false);

      // 3. Kandy manager cannot record equipment record for Colombo resource
      const recordOther = await addEquipmentRecord(kandyManager, resourceId, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Kandy Tech",
        nextDueOn: addDaysToDay(today, 365),
      });
      expect(recordOther.ok).toBe(false);
      if (!recordOther.ok) {
        expect(recordOther.error).toBe(
          "You do not have permission to record equipment care for this resource.",
        );
      }

      // 4. Staff cannot record equipment record
      const recordStaff = await addEquipmentRecord(staffActor, resourceId, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Staff Member",
        nextDueOn: addDaysToDay(today, 365),
      });
      expect(recordStaff.ok).toBe(false);
      if (!recordStaff.ok) {
        expect(recordStaff.error).toBe(
          "You do not have permission to record equipment care for this resource.",
        );
      }
    });
  });

  describe("addEquipmentRecord Outcomes & Rules", () => {
    it("PASS calibration moves nextCalibrationDueOn", async () => {
      const today = labToday();
      const initialDue = addDaysToDay(today, 5);
      const newDue = addDaysToDay(today, 365);

      const res = await createResource(colomboManager, {
        name: "Centrifuge 9000",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: initialDue,
      });
      if (!res.ok) throw new Error("Creation failed");

      const recordRes = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Senior Engineer",
        workPerformed: "Recalibrated speed sensor and rotor imbalance sensor",
        reference: "CERT-CAL-9000",
        nextDueOn: newDue,
      });

      expect(recordRes.ok).toBe(true);

      const updated = await db.resource.findUnique({
        where: { id: res.data.id },
      });
      expect(updated?.nextCalibrationDueOn).toEqual(dayToDb(newDue));
    });

    it("FAIL takes ACTIVE resource to OUT_OF_SERVICE, cancels only unstarted bookings with reason, and keeps maintenance blocks", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Gas Chromatograph",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: addDaysToDay(today, 50),
      });
      if (!res.ok) throw new Error("Creation failed");

      const resourceId = res.data.id;
      const now = new Date();

      // 1. Future unstarted booking (start in 2 hours, end in 4 hours)
      const futureStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const futureEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      const futureBooking = await db.reservation.create({
        data: {
          resourceId,
          createdById: staffActor.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Future experiment",
          startAt: futureStart,
          endAt: futureEnd,
        },
      });

      // 2. In-progress booking (started 1 hour ago, ends in 1 hour)
      const inProgressStart = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      const inProgressEnd = new Date(now.getTime() + 1 * 60 * 60 * 1000);
      const inProgressBooking = await db.reservation.create({
        data: {
          resourceId,
          createdById: staffActor.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Currently running run",
          startAt: inProgressStart,
          endAt: inProgressEnd,
        },
      });

      // 3. Maintenance block in the future
      const maintStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const maintEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);
      const maintBlock = await db.reservation.create({
        data: {
          resourceId,
          createdById: colomboManager.id,
          kind: ReservationKind.MAINTENANCE,
          status: ReservationStatus.CONFIRMED,
          purpose: "Scheduled deep clean",
          startAt: maintStart,
          endAt: maintEnd,
        },
      });

      // Record FAIL performance check
      const failRecord = await addEquipmentRecord(colomboManager, resourceId, {
        kind: EquipmentRecordKind.PERFORMANCE_CHECK,
        outcome: EquipmentOutcome.FAIL,
        performedOn: today,
        performedBy: "Nadeesha Perera",
        workPerformed: "Column pressure check and detector baseline test",
        notes: "Column pressure abnormal, detector baseline drifting.",
      });

      expect(failRecord.ok).toBe(true);
      if (!failRecord.ok) return;
      expect(failRecord.data.cancelledBookingsCount).toBe(1);

      // Verify resource is now OUT_OF_SERVICE
      const updatedResource = await db.resource.findUnique({
        where: { id: resourceId },
      });
      expect(updatedResource?.status).toBe(ResourceStatus.OUT_OF_SERVICE);

      // Future booking was cancelled
      const checkFuture = await db.reservation.findUnique({
        where: { id: futureBooking.id },
      });
      expect(checkFuture?.status).toBe(ReservationStatus.CANCELLED);
      expect(checkFuture?.cancelReason).toContain("Column pressure abnormal");

      // In-progress booking was NOT cancelled (still CONFIRMED)
      const checkInProgress = await db.reservation.findUnique({
        where: { id: inProgressBooking.id },
      });
      expect(checkInProgress?.status).toBe(ReservationStatus.CONFIRMED);

      // Maintenance block was NOT cancelled (still CONFIRMED)
      const checkMaint = await db.reservation.findUnique({
        where: { id: maintBlock.id },
      });
      expect(checkMaint?.status).toBe(ReservationStatus.CONFIRMED);
    });

    it("changeStatus back to ACTIVE is refused after FAIL or while OVERDUE, but allowed after a PASS check", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Spectrophotometer SP-1",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: addDaysToDay(today, 30),
      });
      if (!res.ok) throw new Error("Creation failed");
      const resourceId = res.data.id;

      // 1. Record a FAIL check -> resource becomes OUT_OF_SERVICE
      await addEquipmentRecord(colomboManager, resourceId, {
        kind: EquipmentRecordKind.PERFORMANCE_CHECK,
        outcome: EquipmentOutcome.FAIL,
        performedOn: today,
        performedBy: "Lab Tech",
        workPerformed: "Tested optical accuracy with wavelength calibration standard",
        notes: "Lamp failed wavelength accuracy test.",
      });

      // Attempt changeStatus to ACTIVE -> refused
      const activeAttempt1 = await changeStatus(colomboManager, resourceId, ResourceStatus.ACTIVE);
      expect(activeAttempt1.ok).toBe(false);
      if (!activeAttempt1.ok) {
        expect(activeAttempt1.error).toContain("Record a passing calibration or performance check");
      }

      // 2. Record a PASS performance check
      const passRecord = await addEquipmentRecord(colomboManager, resourceId, {
        kind: EquipmentRecordKind.PERFORMANCE_CHECK,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Senior Service Specialist",
        workPerformed: "Replaced lamp and aligned optical path",
        notes: "Replaced lamp and verified accuracy.",
      });
      expect(passRecord.ok).toBe(true);

      // Attempt changeStatus to ACTIVE -> now allowed!
      const activeAttempt2 = await changeStatus(colomboManager, resourceId, ResourceStatus.ACTIVE);
      expect(activeAttempt2.ok).toBe(true);
      if (activeAttempt2.ok) {
        expect(activeAttempt2.data.status).toBe(ResourceStatus.ACTIVE);
      }

      // 3. If calibration is OVERDUE, changeStatus back to ACTIVE is refused
      await db.resource.update({
        where: { id: resourceId },
        data: {
          nextCalibrationDueOn: dayToDb(addDaysToDay(today, -2)),
          status: ResourceStatus.OUT_OF_SERVICE,
        },
      });

      const activeAttempt3 = await changeStatus(colomboManager, resourceId, ResourceStatus.ACTIVE);
      expect(activeAttempt3.ok).toBe(false);
      if (!activeAttempt3.ok) {
        expect(activeAttempt3.error).toContain("Record a passing calibration or performance check");
      }
    });

    it("review without date is refused, and REPLACE outcome without notes is refused", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Aging Incubator",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        inServiceOn: addDaysToDay(today, -3000),
        expectedServiceLifeYears: 8,
      });
      if (!res.ok) throw new Error("Creation failed");

      // Review without date -> refused
      const reviewNoDate = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.REPLACEMENT_REVIEW,
        outcome: EquipmentOutcome.KEEP_IN_SERVICE,
        performedOn: today,
        performedBy: "Dr. Nadeesha",
        // missing nextDueOn
      });
      expect(reviewNoDate.ok).toBe(false);
      if (!reviewNoDate.ok) {
        expect(reviewNoDate.error).toContain("Enter the review date.");
      }

      // Review REPLACE without notes -> refused
      const replaceNoNotes = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.REPLACEMENT_REVIEW,
        outcome: EquipmentOutcome.REPLACE,
        performedOn: today,
        performedBy: "Dr. Nadeesha",
        nextDueOn: addDaysToDay(today, 180),
        notes: "   ", // empty / whitespace only
      });
      expect(replaceNoNotes.ok).toBe(false);
      if (!replaceNoNotes.ok) {
        expect(replaceNoNotes.error).toContain("Notes are required");
      }
    });

    it("3 repairs in 365 days automatically sets replacementReviewDueOn to today", async () => {
      const today = labToday();
      const futureReview = addDaysToDay(today, 500);

      const res = await createResource(colomboManager, {
        name: "Fragile Stirrer",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        inServiceOn: addDaysToDay(today, -400),
        expectedServiceLifeYears: 5,
        replacementReviewDueOn: futureReview,
      });
      if (!res.ok) throw new Error("Creation failed");
      const resourceId = res.data.id;

      // 1st repair
      await addEquipmentRecord(colomboManager, resourceId, {
        kind: EquipmentRecordKind.REPAIR,
        outcome: EquipmentOutcome.PASS,
        performedOn: addDaysToDay(today, -100),
        performedBy: "Tech A",
        workPerformed: "Removed worn drive belt and installed new belt",
        notes: "Motor belt replaced",
      });

      // 2nd repair
      await addEquipmentRecord(colomboManager, resourceId, {
        kind: EquipmentRecordKind.REPAIR,
        outcome: EquipmentOutcome.PASS,
        performedOn: addDaysToDay(today, -50),
        performedBy: "Tech B",
        workPerformed: "Replaced potentiometer and calibrated speed dial",
        notes: "Speed dial replaced",
      });

      // Check review date has NOT changed yet
      let stored = await db.resource.findUnique({ where: { id: resourceId } });
      expect(stored?.replacementReviewDueOn).toEqual(dayToDb(futureReview));

      // 3rd repair today
      await addEquipmentRecord(colomboManager, resourceId, {
        kind: EquipmentRecordKind.REPAIR,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Tech C",
        workPerformed: "Replaced main spindle bearing and tested vibration",
        notes: "Bearing replaced",
      });

      // 3 repairs in 365 days -> replacementReviewDueOn should now be set to today
      stored = await db.resource.findUnique({ where: { id: resourceId } });
      expect(stored?.replacementReviewDueOn).toEqual(dayToDb(today));
    });

    it("records are refused on a RETIRED resource", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Old Centrifuge To Retire",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDaysToDay(today, 100),
      });
      if (!res.ok) throw new Error("Creation failed");

      // Retire it
      await changeStatus(
        colomboManager,
        res.data.id,
        ResourceStatus.RETIRED,
        "Decommissioned permanently",
      );

      // Attempt to add equipment record
      const recordRes = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Technician",
        workPerformed: "Full calibration check",
        nextDueOn: addDaysToDay(today, 365),
      });

      expect(recordRes.ok).toBe(false);
      if (!recordRes.ok) {
        expect(recordRes.error).toBe(
          "This resource is retired. Its history is kept, but new records cannot be added.",
        );
      }
    });
  });

  describe("Today List & Task Marking (markDone / markNotDone)", () => {
    it("listTodayTasks: manager sees only own-site tasks that are due today or overdue; admin sees all; staff is refused", async () => {
      const today = labToday();

      // Colombo resource due today
      const colomboRes = await createResource(colomboManager, {
        name: "Colombo Biosafety Cabinet",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: today, // DUE TODAY
      });
      if (!colomboRes.ok) throw new Error("Creation failed");

      // Kandy resource overdue by 5 days
      const kandyRes = await createResource(kandyManager, {
        name: "Kandy Autoclave",
        siteId: kandySite.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsMaintenance: true,
        maintenanceIntervalDays: 30,
        nextMaintenanceDueOn: addDaysToDay(today, -5), // OVERDUE
      });
      if (!kandyRes.ok) throw new Error("Creation failed");

      // 1. Colombo manager query
      const colomboTasks = await listTodayTasks(colomboManager);
      expect(colomboTasks.ok).toBe(true);
      if (!colomboTasks.ok) return;
      expect(colomboTasks.data.some((t) => t.resourceId === colomboRes.data.id)).toBe(true);
      expect(colomboTasks.data.some((t) => t.resourceId === kandyRes.data.id)).toBe(false);

      // 2. Kandy manager query
      const kandyTasks = await listTodayTasks(kandyManager);
      expect(kandyTasks.ok).toBe(true);
      if (!kandyTasks.ok) return;
      expect(kandyTasks.data.some((t) => t.resourceId === kandyRes.data.id)).toBe(true);
      expect(kandyTasks.data.some((t) => t.resourceId === colomboRes.data.id)).toBe(false);

      // 3. Admin query: sees both sites
      const adminTasks = await listTodayTasks(adminActor);
      expect(adminTasks.ok).toBe(true);
      if (!adminTasks.ok) return;
      expect(adminTasks.data.some((t) => t.resourceId === colomboRes.data.id)).toBe(true);
      expect(adminTasks.data.some((t) => t.resourceId === kandyRes.data.id)).toBe(true);

      // 4. Staff query: refused
      const staffTasks = await listTodayTasks(staffActor);
      expect(staffTasks.ok).toBe(false);
      if (!staffTasks.ok) {
        expect(staffTasks.error).toBe("You do not have permission to view today's tasks.");
      }
    });

    it("markDone (Pass) on due day moves due date to today + interval and removes task from Today list", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Centrifuge Due Today",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: today,
      });
      if (!res.ok) throw new Error("Creation failed");

      // Verify it is in Today list
      let tasks = await listTodayTasks(colomboManager);
      expect(tasks.ok && tasks.data.some((t) => t.resourceId === res.data.id)).toBe(true);

      // Mark done with PASS
      const doneRes = await markDone(colomboManager, res.data.id, "calibration", {
        outcome: EquipmentOutcome.PASS,
        performedBy: "Service Engineer",
        workPerformed: "Annual optical alignment and speed sensor calibration",
        reference: "CERT-DONE-180",
      });
      expect(doneRes.ok).toBe(true);

      // Next calibration due moved to today + 180
      const updated = await db.resource.findUnique({ where: { id: res.data.id } });
      const expectedDue = addDaysToDay(today, 180);
      expect(updated?.nextCalibrationDueOn).toEqual(dayToDb(expectedDue));

      // Task is no longer in Today list
      tasks = await listTodayTasks(colomboManager);
      expect(tasks.ok && tasks.data.some((t) => t.resourceId === res.data.id)).toBe(false);
    });

    it("markNotDone requires reason, is refused when not due today or overdue, preserves due date, and rejects manager of another site", async () => {
      const today = labToday();

      // 1. Resource with calibration due in 10 days (DUE_SOON, not due today or overdue)
      const resFuture = await createResource(colomboManager, {
        name: "Analyzer Due In 10 Days",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDaysToDay(today, 10),
      });
      if (!resFuture.ok) throw new Error("Creation failed");

      // markNotDone should be refused because it's not due today or overdue
      const earlyNotDone = await markNotDone(colomboManager, resFuture.data.id, "calibration", {
        notes: "Cannot perform early",
      });
      expect(earlyNotDone.ok).toBe(false);
      if (!earlyNotDone.ok) {
        expect(earlyNotDone.error).toContain("only allowed on or after the scheduled due date");
      }

      // 2. Resource due today
      const resDueToday = await createResource(colomboManager, {
        name: "Analyzer Due Today",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: today,
      });
      if (!resDueToday.ok) throw new Error("Creation failed");

      // markNotDone without notes -> refused
      const noReason = await markNotDone(colomboManager, resDueToday.data.id, "calibration", {
        notes: "   ",
      });
      expect(noReason.ok).toBe(false);
      if (!noReason.ok) {
        expect(noReason.error).toContain("Notes are required");
      }

      // Kandy manager marking Colombo resource as not done -> refused
      const otherSite = await markNotDone(kandyManager, resDueToday.data.id, "calibration", {
        notes: "Technician absent",
      });
      expect(otherSite.ok).toBe(false);

      // Colombo manager marking with valid reason -> accepted
      const validNotDone = await markNotDone(colomboManager, resDueToday.data.id, "calibration", {
        notes: "Technician sick, postponed to next week",
        plannedDate: addDaysToDay(today, 7),
      });
      expect(validNotDone.ok).toBe(true);

      // Due date does NOT move! It remains 'today'
      const stored = await db.resource.findUnique({ where: { id: resDueToday.data.id } });
      expect(stored?.nextCalibrationDueOn).toEqual(dayToDb(today));

      // Equipment history has the NOT_DONE record with reason
      const history = await getEquipmentHistory(resDueToday.data.id);
      expect(history.ok).toBe(true);
      if (history.ok) {
        expect(history.data[0].outcome).toBe(EquipmentOutcome.NOT_DONE);
        expect(history.data[0].notes).toBe("Technician sick, postponed to next week");
      }
    });
  });

  describe("Phase 1: Richer record form rules & fields", () => {
    it("requires workPerformed for PASS and FAIL on CALIBRATION, PREVENTIVE_MAINTENANCE, REPAIR, PERFORMANCE_CHECK", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Spectrometer Phase 1",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDaysToDay(today, 10),
      });
      if (!res.ok) throw new Error("Creation failed");

      // 1. Missing workPerformed on PASS CALIBRATION -> refused
      const noWorkPass = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Engineer",
        nextDueOn: addDaysToDay(today, 365),
      });
      expect(noWorkPass.ok).toBe(false);
      if (!noWorkPass.ok) {
        expect(noWorkPass.error).toBe("Describe the work done or changes made.");
      }

      // 2. Missing workPerformed on FAIL PERFORMANCE_CHECK -> refused
      const noWorkFail = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.PERFORMANCE_CHECK,
        outcome: EquipmentOutcome.FAIL,
        performedOn: today,
        performedBy: "Engineer",
        notes: "Failed temperature test",
      });
      expect(noWorkFail.ok).toBe(false);
      if (!noWorkFail.ok) {
        expect(noWorkFail.error).toBe("Describe the work done or changes made.");
      }

      // 3. Valid workPerformed on PASS -> succeeds and saves workPerformed & externalCompany
      const validPass = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "External Specialist",
        workPerformed: "Replaced optical filter and calibrated baseline absorbance",
        externalCompany: "Agilent Technologies",
        nextDueOn: addDaysToDay(today, 365),
      });
      expect(validPass.ok).toBe(true);

      const history = await getEquipmentHistory(res.data.id);
      expect(history.ok).toBe(true);
      if (history.ok) {
        expect(history.data[0].workPerformed).toBe(
          "Replaced optical filter and calibrated baseline absorbance",
        );
        expect(history.data[0].externalCompany).toBe("Agilent Technologies");
      }
    });

    it("does NOT require workPerformed on NOT_DONE", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Centrifuge Not Done Test",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: today, // due today so markNotDone is permitted
      });
      if (!res.ok) throw new Error("Creation failed");

      const notDoneRes = await markNotDone(colomboManager, res.data.id, "calibration", {
        notes: "Part on back-order",
      });
      expect(notDoneRes.ok).toBe(true);
      if (notDoneRes.ok) {
        expect(notDoneRes.data.record.outcome).toBe(EquipmentOutcome.NOT_DONE);
        expect(notDoneRes.data.record.workPerformed).toBeNull();
      }
    });

    it("enforces lengths on workPerformed (max 1000) and externalCompany (max 120)", async () => {
      const today = labToday();
      const res = await createResource(colomboManager, {
        name: "Length Check Resource",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        needsCalibration: true,
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: addDaysToDay(today, 50),
      });
      if (!res.ok) throw new Error("Creation failed");

      // Too long workPerformed
      const tooLongWork = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Tech",
        workPerformed: "A".repeat(1001),
        nextDueOn: addDaysToDay(today, 180),
      });
      expect(tooLongWork.ok).toBe(false);

      // Too long company
      const tooLongCompany = await addEquipmentRecord(colomboManager, res.data.id, {
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: today,
        performedBy: "Tech",
        workPerformed: "Valid work performed",
        externalCompany: "B".repeat(121),
        nextDueOn: addDaysToDay(today, 180),
      });
      expect(tooLongCompany.ok).toBe(false);
    });

    it("initial registration record still saves with workPerformed set", async () => {
      const today = labToday();
      const lastCalibratedOn = addDaysToDay(today, -60);
      const res = await createResource(colomboManager, {
        name: "New Instrument Registered",
        siteId: fixture.site.id,
        categoryId: instrumentCategory.id,
        sectionId: fixture.section.id,
        manufacturer: "Eppendorf",
        model: "5424R",
        serialNumber: "EP-9988",
        needsCalibration: true,
        calibrationIntervalDays: 365,
        lastCalibratedOn,
        nextCalibrationDueOn: addDaysToDay(today, 305),
        calibratedBy: "Eppendorf Service",
      });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      const records = await db.equipmentRecord.findMany({
        where: { resourceId: res.data.id },
      });
      expect(records.length).toBe(1);
      expect(records[0].outcome).toBe(EquipmentOutcome.PASS);
      expect(records[0].workPerformed).toContain("Initial record: last calibrated on");
    });
  });
});
