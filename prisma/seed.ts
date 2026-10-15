import nextEnv from "@next/env";

// Load environment variables exactly like prisma.config.ts
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

import { z } from "zod";
import bcrypt from "bcryptjs";
import { TZDate } from "@date-fns/tz";
import { addDays } from "date-fns";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
  EquipmentRecordKind,
  EquipmentOutcome,
} from "../src/generated/prisma/client";
import { BCRYPT_COST } from "../src/config/rules";

const seedEnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_TIME_ZONE: z.string().min(1).default("Asia/Colombo"),
  SEED_ADMIN_NAME: z.string().min(1).default("Lab Administrator"),
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(15, "SEED_ADMIN_PASSWORD must be at least 15 characters"),
  SEED_MANAGER_EMAIL: z.string().email().optional().or(z.literal("")),
  SEED_MANAGER_PASSWORD: z.string().min(15).optional().or(z.literal("")),
  SEED_STAFF_EMAIL: z.string().email().optional().or(z.literal("")),
  SEED_STAFF_PASSWORD: z.string().min(15).optional().or(z.literal("")),
  SEED_SAMPLE_BOOKINGS: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((val) => val === "true"),
});

const seedEnv = seedEnvSchema.parse(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: seedEnv.DATABASE_URL }),
});

function getLabDay(daysFromToday: number, zone: string): Date {
  const now = new Date();
  const tzNow = new TZDate(now, zone);
  const target = addDays(tzNow, daysFromToday);
  return new Date(Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()));
}

function getLabSlotTime(daysFromToday: number, hour: number, minute: number, zone: string): Date {
  const now = new Date();
  const tzNow = new TZDate(now, zone);
  const target = addDays(tzNow, daysFromToday);
  return new TZDate(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    hour,
    minute,
    0,
    0,
    zone,
  );
}

async function main() {
  const zone = seedEnv.APP_TIME_ZONE;
  console.log(`[seed] Seeding database in time zone: ${zone}`);

  // 1. Sites
  console.log("[seed] Seeding sites...");
  const sitesData = [
    { name: "Main Laboratory, Colombo", address: "35 Norris Canal Rd, Colombo 10" },
    { name: "Kandy Branch Laboratory", address: "12 Kotugodella Veediya, Kandy" },
    { name: "Galle Branch Laboratory", address: "48 Wakwella Rd, Galle" },
  ];

  const siteMap = new Map<string, string>();
  for (const s of sitesData) {
    const site = await prisma.site.upsert({
      where: { name: s.name },
      update: { address: s.address },
      create: s,
    });
    siteMap.set(s.name, site.id);
  }

  // 2. Sections
  console.log("[seed] Seeding sections...");
  const sectionsData = [
    "Molecular Diagnostics",
    "Clinical Biochemistry",
    "Haematology",
    "Microbiology",
    "Serology",
    "Administration",
  ];

  const sectionMap = new Map<string, string>();
  for (const name of sectionsData) {
    const sec = await prisma.section.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    sectionMap.set(name, sec.id);
  }

  // 3. Categories
  console.log("[seed] Seeding categories...");
  const categoriesData = [
    { name: "Molecular analysers", iconKey: "molecular", maxBookingMinutes: 480 },
    { name: "Analytical instruments", iconKey: "analytical", maxBookingMinutes: 720 },
    { name: "Microscopy & cytometry", iconKey: "microscopy", maxBookingMinutes: 240 },
    { name: "Biosafety cabinets", iconKey: "biosafety", maxBookingMinutes: 240 },
    { name: "Rooms", iconKey: "room", maxBookingMinutes: 480 },
    { name: "Sample transport vehicles", iconKey: "vehicle", maxBookingMinutes: 600 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: { iconKey: cat.iconKey, maxBookingMinutes: cat.maxBookingMinutes },
      create: cat,
    });
    categoryMap.set(cat.name, c.id);
  }

  // 4. Accounts
  console.log("[seed] Seeding accounts...");
  const accountsTable: Array<{
    Role: string;
    Name: string;
    Email: string;
    Site: string;
    Password: string;
  }> = [];

  // 4a. Admin
  const adminEmail = seedEnv.SEED_ADMIN_EMAIL.toLowerCase();
  const adminHash = await bcrypt.hash(seedEnv.SEED_ADMIN_PASSWORD, BCRYPT_COST);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: seedEnv.SEED_ADMIN_NAME,
      passwordHash: adminHash,
      role: Role.ADMIN,
      siteId: null,
      sectionId: null,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      name: seedEnv.SEED_ADMIN_NAME,
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN,
      siteId: null,
      sectionId: null,
      isActive: true,
      mustChangePassword: false,
    },
  });
  accountsTable.push({
    Role: "ADMIN",
    Name: adminUser.name,
    Email: adminEmail,
    Site: "—",
    Password: seedEnv.SEED_ADMIN_PASSWORD,
  });

  // 4b. Manager (Nadeesha Perera at Main Laboratory, Colombo)
  let managerUser: typeof adminUser | null = null;
  if (seedEnv.SEED_MANAGER_EMAIL && seedEnv.SEED_MANAGER_PASSWORD) {
    const managerEmail = seedEnv.SEED_MANAGER_EMAIL.toLowerCase();
    const managerHash = await bcrypt.hash(seedEnv.SEED_MANAGER_PASSWORD, BCRYPT_COST);
    const colomboSiteId = siteMap.get("Main Laboratory, Colombo")!;
    managerUser = await prisma.user.upsert({
      where: { email: managerEmail },
      update: {
        name: "Nadeesha Perera",
        passwordHash: managerHash,
        role: Role.MANAGER,
        siteId: colomboSiteId,
        sectionId: null,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        name: "Nadeesha Perera",
        email: managerEmail,
        passwordHash: managerHash,
        role: Role.MANAGER,
        siteId: colomboSiteId,
        sectionId: null,
        isActive: true,
        mustChangePassword: false,
      },
    });
    accountsTable.push({
      Role: "MANAGER",
      Name: "Nadeesha Perera",
      Email: managerEmail,
      Site: "Main Laboratory, Colombo",
      Password: seedEnv.SEED_MANAGER_PASSWORD,
    });
  }

  // 4c. Staff (Kasun Silva at Main Laboratory, Colombo / Molecular Diagnostics)
  let staffUser: typeof adminUser | null = null;
  if (seedEnv.SEED_STAFF_EMAIL && seedEnv.SEED_STAFF_PASSWORD) {
    const staffEmail = seedEnv.SEED_STAFF_EMAIL.toLowerCase();
    const staffHash = await bcrypt.hash(seedEnv.SEED_STAFF_PASSWORD, BCRYPT_COST);
    const colomboSiteId = siteMap.get("Main Laboratory, Colombo")!;
    const molSecId = sectionMap.get("Molecular Diagnostics")!;
    staffUser = await prisma.user.upsert({
      where: { email: staffEmail },
      update: {
        name: "Kasun Silva",
        passwordHash: staffHash,
        role: Role.STAFF,
        siteId: colomboSiteId,
        sectionId: molSecId,
        isActive: true,
        mustChangePassword: false,
      },
      create: {
        name: "Kasun Silva",
        email: staffEmail,
        passwordHash: staffHash,
        role: Role.STAFF,
        siteId: colomboSiteId,
        sectionId: molSecId,
        isActive: true,
        mustChangePassword: false,
      },
    });
    accountsTable.push({
      Role: "STAFF",
      Name: "Kasun Silva",
      Email: staffEmail,
      Site: "Main Laboratory, Colombo",
      Password: seedEnv.SEED_STAFF_PASSWORD,
    });
  }

  // 5. Resources & Initial PASS records
  console.log("[seed] Seeding 12 resources and initial commissioning records...");

  interface SeedResourceDef {
    name: string;
    siteName: string;
    categoryName: string;
    sectionName: string;
    location?: string;
    capacity?: number;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    inServiceDaysAgo?: number;
    expectedServiceLifeYears?: number;
    calibrationIntervalDays?: number;
    nextCalibrationDueDays?: number; // 0 = today, 3 = in 3 days, etc.
    maintenanceIntervalDays?: number;
    nextMaintenanceDueDays?: number; // 7 = in 7 days, etc.
    replacementReviewDueDays?: number;
  }

  const resourceDefs: SeedResourceDef[] = [
    // Colombo (6 resources)
    {
      name: "PCR Unit 01",
      siteName: "Main Laboratory, Colombo",
      categoryName: "Molecular analysers",
      sectionName: "Molecular Diagnostics",
      location: "Room 204, Bench 1",
      manufacturer: "Applied Biosystems",
      model: "QuantStudio 5",
      serialNumber: "QS5-2024-001",
      inServiceDaysAgo: 180,
      expectedServiceLifeYears: 7,
      calibrationIntervalDays: 180,
      nextCalibrationDueDays: 0, // DUE TODAY!
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 90,
      replacementReviewDueDays: 1800,
    },
    {
      name: "Biosafety Cabinet A",
      siteName: "Main Laboratory, Colombo",
      categoryName: "Biosafety cabinets",
      sectionName: "Microbiology",
      location: "Containment Suite B",
      manufacturer: "Esco",
      model: "Airstream Class II",
      serialNumber: "ESC-AC2-4E8",
      inServiceDaysAgo: 177,
      expectedServiceLifeYears: 10,
      calibrationIntervalDays: 180,
      nextCalibrationDueDays: 3, // DUE IN 3 DAYS!
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 120,
      replacementReviewDueDays: 2500,
    },
    {
      name: "HPLC System",
      siteName: "Main Laboratory, Colombo",
      categoryName: "Analytical instruments",
      sectionName: "Clinical Biochemistry",
      location: "Analytical Lab 1",
      manufacturer: "Shimadzu",
      model: "Prominence LC-20AD",
      serialNumber: "LC20-99214",
      inServiceDaysAgo: 173,
      expectedServiceLifeYears: 8,
      calibrationIntervalDays: 365,
      nextCalibrationDueDays: 45,
      maintenanceIntervalDays: 180,
      nextMaintenanceDueDays: 7, // DUE IN 7 DAYS!
      replacementReviewDueDays: 2100,
    },
    {
      name: "Flow Cytometer",
      siteName: "Main Laboratory, Colombo",
      categoryName: "Microscopy & cytometry",
      sectionName: "Haematology",
      location: "Cell Analysis Suite",
      manufacturer: "BD Biosciences",
      model: "FACSLyric",
      serialNumber: "BD-FL-1082",
      inServiceDaysAgo: 135,
      expectedServiceLifeYears: 6,
      calibrationIntervalDays: 180,
      nextCalibrationDueDays: 45,
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 180,
      replacementReviewDueDays: 1500,
    },
    {
      name: "Training Room",
      siteName: "Main Laboratory, Colombo",
      categoryName: "Rooms",
      sectionName: "Administration",
      location: "Level 2, North Wing",
      capacity: 24,
    },
    {
      name: "Sample Van 1",
      siteName: "Main Laboratory, Colombo",
      categoryName: "Sample transport vehicles",
      sectionName: "Administration",
      location: "Rear Transport Bay",
      manufacturer: "Toyota",
      model: "HiAce Refrigerated",
      serialNumber: "WP-ND-4021",
      inServiceDaysAgo: 60,
      expectedServiceLifeYears: 5,
      maintenanceIntervalDays: 90,
      nextMaintenanceDueDays: 30,
    },

    // Kandy (4 resources)
    {
      name: "Haematology Analyser",
      siteName: "Kandy Branch Laboratory",
      categoryName: "Analytical instruments",
      sectionName: "Haematology",
      location: "Automated Line 1",
      manufacturer: "Sysmex",
      model: "XN-1000",
      serialNumber: "SYX-1004",
      inServiceDaysAgo: 120,
      expectedServiceLifeYears: 8,
      calibrationIntervalDays: 180,
      nextCalibrationDueDays: 60,
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 200,
    },
    {
      name: "ELISA Reader",
      siteName: "Kandy Branch Laboratory",
      categoryName: "Analytical instruments",
      sectionName: "Serology",
      location: "Bench 3",
      manufacturer: "Bio-Rad",
      model: "iMark Microplate",
      serialNumber: "BR-IM-3301",
      inServiceDaysAgo: 275,
      expectedServiceLifeYears: 7,
      calibrationIntervalDays: 365,
      nextCalibrationDueDays: 90,
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 150,
    },
    {
      name: "Microscope Suite A",
      siteName: "Kandy Branch Laboratory",
      categoryName: "Microscopy & cytometry",
      sectionName: "Microbiology",
      location: "Dark Room 2",
      manufacturer: "Olympus",
      model: "BX53 Upright",
      serialNumber: "OLY-BX53-882",
      inServiceDaysAgo: 105,
      expectedServiceLifeYears: 10,
      maintenanceIntervalDays: 180,
      nextMaintenanceDueDays: 75,
    },
    {
      name: "Meeting Room",
      siteName: "Kandy Branch Laboratory",
      categoryName: "Rooms",
      sectionName: "Administration",
      location: "Main Entrance Wing",
      capacity: 12,
    },

    // Galle (2 resources)
    {
      name: "Clinical Chemistry Analyser",
      siteName: "Galle Branch Laboratory",
      categoryName: "Analytical instruments",
      sectionName: "Clinical Biochemistry",
      location: "Core Lab Galle",
      manufacturer: "Roche",
      model: "Cobas c311",
      serialNumber: "RO-C311-551",
      inServiceDaysAgo: 60,
      expectedServiceLifeYears: 8,
      calibrationIntervalDays: 180,
      nextCalibrationDueDays: 120,
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 240,
    },
    {
      name: "Biosafety Cabinet B",
      siteName: "Galle Branch Laboratory",
      categoryName: "Biosafety cabinets",
      sectionName: "Microbiology",
      location: "Culture Room",
      manufacturer: "Thermo Scientific",
      model: "1300 Series A2",
      serialNumber: "TS-1300-88",
      inServiceDaysAgo: 30,
      expectedServiceLifeYears: 10,
      calibrationIntervalDays: 180,
      nextCalibrationDueDays: 150,
      maintenanceIntervalDays: 365,
      nextMaintenanceDueDays: 210,
    },
  ];

  const resourceMap = new Map<string, string>();

  for (const def of resourceDefs) {
    const siteId = siteMap.get(def.siteName)!;
    const categoryId = categoryMap.get(def.categoryName)!;
    const sectionId = sectionMap.get(def.sectionName)!;

    const inServiceOn =
      def.inServiceDaysAgo !== undefined ? getLabDay(-def.inServiceDaysAgo, zone) : null;
    const nextCalibrationDueOn =
      def.nextCalibrationDueDays !== undefined ? getLabDay(def.nextCalibrationDueDays, zone) : null;
    const nextMaintenanceDueOn =
      def.nextMaintenanceDueDays !== undefined ? getLabDay(def.nextMaintenanceDueDays, zone) : null;
    const replacementReviewDueOn =
      def.replacementReviewDueDays !== undefined
        ? getLabDay(def.replacementReviewDueDays, zone)
        : null;

    const resource = await prisma.resource.upsert({
      where: {
        siteId_name: {
          siteId,
          name: def.name,
        },
      },
      update: {
        categoryId,
        sectionId,
        location: def.location ?? null,
        capacity: def.capacity ?? null,
        status: ResourceStatus.ACTIVE,
        manufacturer: def.manufacturer ?? null,
        model: def.model ?? null,
        serialNumber: def.serialNumber ?? null,
        inServiceOn,
        expectedServiceLifeYears: def.expectedServiceLifeYears ?? null,
        calibrationIntervalDays: def.calibrationIntervalDays ?? null,
        nextCalibrationDueOn,
        maintenanceIntervalDays: def.maintenanceIntervalDays ?? null,
        nextMaintenanceDueOn,
        replacementReviewDueOn,
      },
      create: {
        name: def.name,
        siteId,
        categoryId,
        sectionId,
        location: def.location ?? null,
        capacity: def.capacity ?? null,
        status: ResourceStatus.ACTIVE,
        manufacturer: def.manufacturer ?? null,
        model: def.model ?? null,
        serialNumber: def.serialNumber ?? null,
        inServiceOn,
        expectedServiceLifeYears: def.expectedServiceLifeYears ?? null,
        calibrationIntervalDays: def.calibrationIntervalDays ?? null,
        nextCalibrationDueOn,
        maintenanceIntervalDays: def.maintenanceIntervalDays ?? null,
        nextMaintenanceDueOn,
        replacementReviewDueOn,
      },
    });

    resourceMap.set(def.name, resource.id);

    // Initial commissioning PASS records matching registration
    if (inServiceOn && def.calibrationIntervalDays) {
      const existingCalRecord = await prisma.equipmentRecord.findFirst({
        where: {
          resourceId: resource.id,
          kind: EquipmentRecordKind.CALIBRATION,
          performedOn: inServiceOn,
        },
      });

      if (!existingCalRecord) {
        await prisma.equipmentRecord.create({
          data: {
            resourceId: resource.id,
            kind: EquipmentRecordKind.CALIBRATION,
            outcome: EquipmentOutcome.PASS,
            performedOn: inServiceOn,
            performedBy: "BioMed Engineering Services",
            workPerformed:
              "Initial commissioning calibration and diagnostic qualification. Verified against ISO 15189 reference tolerances.",
            reference: `CAL-INIT-${resource.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`,
            nextDueOn: nextCalibrationDueOn,
            recordedById: adminUser.id,
          },
        });
      }
    }

    if (inServiceOn && def.maintenanceIntervalDays && !def.calibrationIntervalDays) {
      const existingMaintRecord = await prisma.equipmentRecord.findFirst({
        where: {
          resourceId: resource.id,
          kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
          performedOn: inServiceOn,
        },
      });

      if (!existingMaintRecord) {
        await prisma.equipmentRecord.create({
          data: {
            resourceId: resource.id,
            kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
            outcome: EquipmentOutcome.PASS,
            performedOn: inServiceOn,
            performedBy: "Manufacturer Technical Service",
            workPerformed: "Initial preventive maintenance check and operational qualification.",
            reference: `PM-INIT-${resource.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`,
            nextDueOn: nextMaintenanceDueOn,
            recordedById: adminUser.id,
          },
        });
      }
    }
  }

  // 6. Optional sample bookings
  if (seedEnv.SEED_SAMPLE_BOOKINGS && staffUser && managerUser) {
    console.log("[seed] Seeding 5 confirmed sample bookings (SEED_SAMPLE_BOOKINGS=true)...");
    const pcrId = resourceMap.get("PCR Unit 01");
    const flowId = resourceMap.get("Flow Cytometer");
    const hplcId = resourceMap.get("HPLC System");
    const roomId = resourceMap.get("Training Room");

    if (pcrId && flowId && hplcId && roomId) {
      const bookingsData = [
        {
          resourceId: pcrId,
          createdById: staffUser.id,
          startAt: getLabSlotTime(0, 9, 0, zone),
          endAt: getLabSlotTime(0, 11, 0, zone),
          purpose: "Viral RNA Extraction & Amplification Batch 1",
        },
        {
          resourceId: pcrId,
          createdById: managerUser.id,
          startAt: getLabSlotTime(0, 13, 0, zone),
          endAt: getLabSlotTime(0, 15, 0, zone),
          purpose: "Respiratory Pathogen Panel Run",
        },
        {
          resourceId: flowId,
          createdById: staffUser.id,
          startAt: getLabSlotTime(0, 10, 0, zone),
          endAt: getLabSlotTime(0, 12, 0, zone),
          purpose: "Leukaemia Phenotyping Panel Analysis",
        },
        {
          resourceId: hplcId,
          createdById: managerUser.id,
          startAt: getLabSlotTime(1, 9, 30, zone),
          endAt: getLabSlotTime(1, 11, 30, zone),
          purpose: "Therapeutic Drug Monitoring Validation",
        },
        {
          resourceId: roomId,
          createdById: staffUser.id,
          startAt: getLabSlotTime(1, 14, 0, zone),
          endAt: getLabSlotTime(1, 16, 0, zone),
          purpose: "Biosafety Level 2 Refresher Training",
          attendeeCount: 12,
        },
      ];

      for (const b of bookingsData) {
        const existing = await prisma.reservation.findFirst({
          where: {
            resourceId: b.resourceId,
            startAt: b.startAt,
            status: ReservationStatus.CONFIRMED,
          },
        });
        if (!existing) {
          await prisma.reservation.create({
            data: {
              resourceId: b.resourceId,
              createdById: b.createdById,
              kind: ReservationKind.BOOKING,
              status: ReservationStatus.CONFIRMED,
              startAt: b.startAt,
              endAt: b.endAt,
              purpose: b.purpose,
              attendeeCount: b.attendeeCount,
            },
          });
        }
      }
    }
  }

  console.log("\n[seed] Seed completed successfully!\n");
  console.table(accountsTable);
}

main()
  .catch((e) => {
    console.error("[seed] Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
