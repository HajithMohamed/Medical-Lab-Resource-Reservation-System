import nextEnv from "@next/env";

// Load environment variables exactly like prisma.config.ts
nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

import { z } from "zod";
import bcrypt from "bcryptjs";
import { TZDate } from "@date-fns/tz";
import { addDays, subDays, getDay, format } from "date-fns";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  ResourceStatus,
  ReservationKind,
  ReservationStatus,
  EquipmentRecordKind,
  EquipmentOutcome,
  type Prisma,
} from "../src/generated/prisma/client";
import { BCRYPT_COST } from "../src/config/rules";

const seedEnvSchema = z
  .object({
    NODE_ENV: z.string().optional().default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    APP_TIME_ZONE: z.string().min(1).default("Asia/Colombo"),
    SEED_ADMIN_NAME: z.string().min(1).default("Lab Administrator"),
    SEED_ADMIN_EMAIL: z.string().email(),
    SEED_ADMIN_PASSWORD: z.string().min(15, "SEED_ADMIN_PASSWORD must be at least 15 characters"),
    SEED_DEMO_DATA: z.enum(["true", "false"]).default("false"),
    SEED_DEMO_PASSWORD: z.string().min(15).optional(),
  })
  .refine(
    (data) => {
      if (data.SEED_DEMO_DATA === "true" && data.NODE_ENV !== "production") {
        return !!data.SEED_DEMO_PASSWORD && data.SEED_DEMO_PASSWORD.length >= 15;
      }
      return true;
    },
    {
      message: "SEED_DEMO_PASSWORD must be at least 15 characters when SEED_DEMO_DATA is 'true'",
      path: ["SEED_DEMO_PASSWORD"],
    },
  );

const seedEnv = seedEnvSchema.parse(process.env);

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: seedEnv.DATABASE_URL }),
});

function labTime(day: Date, timeStr: string, timeZone: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  return new TZDate(y, m, d, hours, minutes, 0, 0, timeZone);
}

function isWorkingDay(d: Date): boolean {
  const dayOfWeek = getDay(d);
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

async function main() {
  console.log("Seeding database...");

  // 1. Admin User
  const adminEmail = seedEnv.SEED_ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`Admin user with email ${adminEmail} already exists. Leaving unchanged.`);
  } else {
    const adminPasswordHash = await bcrypt.hash(seedEnv.SEED_ADMIN_PASSWORD, BCRYPT_COST);
    const mustChangePassword = seedEnv.SEED_DEMO_DATA === "true" ? false : true;

    await prisma.user.create({
      data: {
        name: seedEnv.SEED_ADMIN_NAME,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: Role.ADMIN,
        mustChangePassword,
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
  }

  // 2. Demo data
  if (seedEnv.SEED_DEMO_DATA !== "true" || seedEnv.NODE_ENV === "production") {
    console.log("Demo data skipped (SEED_DEMO_DATA is not 'true' or NODE_ENV is 'production').");
    return;
  }

  const existingSiteCount = await prisma.site.count();
  if (existingSiteCount > 0) {
    console.log("Demo data already present. Run npm run db:reset to start again.");
    return;
  }

  console.log("Creating demo data for three-site lab network inside a transaction...");

  const demoPassword = seedEnv.SEED_DEMO_PASSWORD!;
  const demoPasswordHash = await bcrypt.hash(demoPassword, BCRYPT_COST);

  // Calculate working days in APP_TIME_ZONE
  // 20 working days before today, today if working day, 5 working days after today
  const timeZone = seedEnv.APP_TIME_ZONE;
  const nowInLab = new TZDate(new Date(), timeZone);
  const todayLab = new TZDate(
    nowInLab.getFullYear(),
    nowInLab.getMonth(),
    nowInLab.getDate(),
    timeZone,
  );

  // Past 20 working days
  const pastWorkingDays: Date[] = [];
  let cursor = subDays(todayLab, 1);
  while (pastWorkingDays.length < 20) {
    if (isWorkingDay(cursor)) {
      pastWorkingDays.push(
        new TZDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), timeZone),
      );
    }
    cursor = subDays(cursor, 1);
  }
  // Reverse so they are in chronological order (oldest to newest: pastWorkingDays[19] = yesterday)
  pastWorkingDays.reverse();

  // Helper getters:
  // getPastWorkingDay(1) = 1st working day before today (yesterday or last Friday)
  // getPastWorkingDay(20) = 20th working day before today
  const getPastWorkingDay = (n: number) => pastWorkingDays[20 - n];

  // Today if working day
  const todayWorkingDay = isWorkingDay(todayLab) ? [todayLab] : [];

  // Future 5 working days
  const futureWorkingDays: Date[] = [];
  cursor = addDays(todayLab, 1);
  while (futureWorkingDays.length < 5) {
    if (isWorkingDay(cursor)) {
      futureWorkingDays.push(
        new TZDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), timeZone),
      );
    }
    cursor = addDays(cursor, 1);
  }

  // Helper getters:
  // getFutureWorkingDay(1) = 1st working day after today
  // getFutureWorkingDay(5) = 5th working day after today
  const getFutureWorkingDay = (n: number) => futureWorkingDays[n - 1];

  // Combined all working days used
  const allWorkingDays = [...pastWorkingDays, ...todayWorkingDay, ...futureWorkingDays];

  await prisma.$transaction(
    async (tx) => {
      // Sites
      const siteColombo = await tx.site.create({
        data: { name: "Main Laboratory, Colombo", address: "Colombo 07" },
      });
      const siteKandy = await tx.site.create({
        data: { name: "Kandy Branch Laboratory", address: "Kandy" },
      });
      const siteGalle = await tx.site.create({
        data: { name: "Galle Branch Laboratory", address: "Galle" },
      });

      // Sections
      const secBiochem = await tx.section.create({ data: { name: "Clinical Biochemistry" } });
      const secHaem = await tx.section.create({ data: { name: "Haematology" } });
      const secMicro = await tx.section.create({ data: { name: "Microbiology" } });
      const secMol = await tx.section.create({ data: { name: "Molecular Diagnostics" } });
      const secHisto = await tx.section.create({ data: { name: "Histopathology" } });
      const secAdmin = await tx.section.create({ data: { name: "Administration" } });

      // Categories
      const catMol = await tx.category.create({
        data: { name: "Molecular instruments", maxBookingMinutes: 240, iconKey: "molecular" },
      });
      const catAnal = await tx.category.create({
        data: { name: "Analytical instruments", maxBookingMinutes: 720, iconKey: "analytical" },
      });
      const catMicro = await tx.category.create({
        data: { name: "Microscopy", maxBookingMinutes: 180, iconKey: "microscopy" },
      });
      const catBio = await tx.category.create({
        data: { name: "Biosafety cabinets", maxBookingMinutes: 240, iconKey: "biosafety" },
      });
      const catSter = await tx.category.create({
        data: { name: "Sterilisation", maxBookingMinutes: 120, iconKey: "sterilisation" },
      });
      const catRoom = await tx.category.create({
        data: { name: "Rooms", maxBookingMinutes: 480, iconKey: "room" },
      });
      const catVeh = await tx.category.create({
        data: { name: "Vehicles", maxBookingMinutes: 600, iconKey: "vehicle" },
      });

      // Resources (demo values; a real lab copies intervals from each instrument's manual; dates relative to today)
      // Colombo
      const pcr1 = await tx.resource.create({
        data: {
          name: "Real-time PCR machine 1",
          categoryId: catMol.id,
          siteId: siteColombo.id,
          sectionId: secMol.id,
          location: "Molecular lab, room 2.14",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Bio-Rad",
          model: "CFX96 Touch",
          serialNumber: "DEMO-PCR-0001",
          inServiceOn: new Date("2021-01-15T00:00:00Z"),
          calibrationIntervalDays: 365,
          nextCalibrationDueOn: subDays(todayLab, 3), // overdue by 3 days
        },
      });
      const pcr2 = await tx.resource.create({
        data: {
          name: "Real-time PCR machine 2",
          categoryId: catMol.id,
          siteId: siteColombo.id,
          sectionId: secMol.id,
          location: "Molecular lab, room 2.14",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Applied Biosystems",
          model: "QuantStudio 5",
          serialNumber: "DEMO-PCR-0002",
          inServiceOn: new Date("2022-03-20T00:00:00Z"),
          calibrationIntervalDays: 365,
          nextCalibrationDueOn: addDays(todayLab, 265),
        },
      });
      const hplc = await tx.resource.create({
        data: {
          name: "HPLC system",
          categoryId: catAnal.id,
          siteId: siteColombo.id,
          sectionId: secBiochem.id,
          location: "Biochemistry lab, bench 4",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Agilent Technologies",
          model: "1260 Infinity II",
          serialNumber: "DEMO-HPLC-0001",
          inServiceOn: new Date("2021-04-12T00:00:00Z"),
          calibrationIntervalDays: 180,
          nextCalibrationDueOn: addDays(todayLab, 120),
          maintenanceIntervalDays: 180,
          nextMaintenanceDueOn: addDays(todayLab, 120),
        },
      });
      const flowCytometer = await tx.resource.create({
        data: {
          name: "Flow cytometer",
          categoryId: catAnal.id,
          siteId: siteColombo.id,
          sectionId: secHaem.id,
          location: "Haematology lab",
          status: ResourceStatus.OUT_OF_SERVICE,
          manufacturer: "BD Biosciences",
          model: "FACSCanto II",
          serialNumber: "DEMO-CYTO-0001",
          inServiceOn: new Date("2020-09-01T00:00:00Z"),
          calibrationIntervalDays: 180,
          nextCalibrationDueOn: addDays(todayLab, 90),
        },
      });
      const fluorMicr = await tx.resource.create({
        data: {
          name: "Fluorescence microscope",
          categoryId: catMicro.id,
          siteId: siteColombo.id,
          sectionId: secMicro.id,
          location: "Microbiology lab",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Nikon",
          model: "Eclipse Ni-U",
          serialNumber: "DEMO-MIC-0002",
          inServiceOn: new Date("2021-02-10T00:00:00Z"),
          maintenanceIntervalDays: 180,
          nextMaintenanceDueOn: addDays(todayLab, 140),
        },
      });
      const bscA = await tx.resource.create({
        data: {
          name: "Biosafety cabinet A (Class II)",
          categoryId: catBio.id,
          siteId: siteColombo.id,
          sectionId: secMicro.id,
          location: "Microbiology lab, room 1.08",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Thermo Fisher Scientific",
          model: "1300 Series A2",
          serialNumber: "DEMO-BSC-0001",
          inServiceOn: new Date("2020-06-10T00:00:00Z"),
          calibrationIntervalDays: 365,
          nextCalibrationDueOn: addDays(todayLab, 10), // due in ~10 days (Due soon)
        },
      });
      const bscB = await tx.resource.create({
        data: {
          name: "Biosafety cabinet B (Class II)",
          categoryId: catBio.id,
          siteId: siteColombo.id,
          sectionId: secMol.id,
          location: "Molecular lab, room 2.16",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Esco",
          model: "Airstream Class II",
          serialNumber: "DEMO-BSC-0002",
          inServiceOn: new Date("2019-11-01T00:00:00Z"),
          calibrationIntervalDays: 365,
          nextCalibrationDueOn: todayLab, // due TODAY! Shows in Nadeesha's Today list
        },
      });
      const autoclave1 = await tx.resource.create({
        data: {
          name: "Autoclave 1",
          categoryId: catSter.id,
          siteId: siteColombo.id,
          sectionId: secMicro.id,
          location: "Wash-up room",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Tuttnauer",
          model: "3870EL",
          serialNumber: "DEMO-AUT-0001",
          inServiceOn: new Date("2020-03-15T00:00:00Z"),
          maintenanceIntervalDays: 30,
          nextMaintenanceDueOn: addDays(todayLab, 15),
        },
      });
      const trainingRoom = await tx.resource.create({
        data: {
          name: "Training room",
          categoryId: catRoom.id,
          siteId: siteColombo.id,
          sectionId: secAdmin.id,
          location: "Ground floor",
          capacity: 20,
          status: ResourceStatus.ACTIVE,
        },
      });
      const van1 = await tx.resource.create({
        data: {
          name: "Sample transport van 1",
          categoryId: catVeh.id,
          siteId: siteColombo.id,
          sectionId: secAdmin.id,
          location: "Car park",
          status: ResourceStatus.ACTIVE,
          manufacturer: "Toyota",
          model: "HiAce Van",
          serialNumber: "WP-NB-1024",
          inServiceOn: new Date("2022-01-01T00:00:00Z"),
          maintenanceIntervalDays: 90,
          nextMaintenanceDueOn: addDays(todayLab, 60),
        },
      });

      // Kandy
      const pcrKandy = await tx.resource.create({
        data: {
          name: "Real-time PCR machine",
          categoryId: catMol.id,
          siteId: siteKandy.id,
          sectionId: secMol.id,
          status: ResourceStatus.OUT_OF_SERVICE, // last performance check failed
          manufacturer: "Bio-Rad",
          model: "CFX96",
          serialNumber: "DEMO-PCR-0003",
          inServiceOn: new Date("2022-05-18T00:00:00Z"),
          calibrationIntervalDays: 365,
          nextCalibrationDueOn: addDays(todayLab, 180),
        },
      });
      const bscKandy = await tx.resource.create({
        data: {
          name: "Biosafety cabinet",
          categoryId: catBio.id,
          siteId: siteKandy.id,
          sectionId: secMicro.id,
          status: ResourceStatus.ACTIVE,
          manufacturer: "Labconco",
          model: "Purifier Logic+ Class II",
          serialNumber: "DEMO-BSC-0003",
          inServiceOn: new Date("2021-08-15T00:00:00Z"),
          calibrationIntervalDays: 365,
          nextCalibrationDueOn: addDays(todayLab, 10), // due in ~10 days (Due soon)
        },
      });
      const autoclaveKandy = await tx.resource.create({
        data: {
          name: "Autoclave",
          categoryId: catSter.id,
          siteId: siteKandy.id,
          sectionId: secMicro.id,
          status: ResourceStatus.ACTIVE,
          manufacturer: "Tuttnauer",
          model: "3870EL",
          serialNumber: "DEMO-AUT-0002",
          inServiceOn: new Date("2021-09-01T00:00:00Z"),
          maintenanceIntervalDays: 30,
          nextMaintenanceDueOn: todayLab, // due today!
        },
      });
      const meetingRoomKandy = await tx.resource.create({
        data: {
          name: "Meeting room",
          categoryId: catRoom.id,
          siteId: siteKandy.id,
          sectionId: secAdmin.id,
          capacity: 12,
          status: ResourceStatus.ACTIVE,
        },
      });
      const van2 = await tx.resource.create({
        data: {
          name: "Sample transport van 2",
          categoryId: catVeh.id,
          siteId: siteKandy.id,
          sectionId: secAdmin.id,
          status: ResourceStatus.ACTIVE,
          manufacturer: "Nissan",
          model: "NV350 Caravan",
          serialNumber: "CP-PA-5091",
          inServiceOn: new Date("2022-07-01T00:00:00Z"),
          maintenanceIntervalDays: 90,
          nextMaintenanceDueOn: addDays(todayLab, 45),
        },
      });

      // Galle
      const micrGalle = await tx.resource.create({
        data: {
          name: "Microscope",
          categoryId: catMicro.id,
          siteId: siteGalle.id,
          sectionId: secHisto.id,
          status: ResourceStatus.ACTIVE,
          manufacturer: "Olympus",
          model: "BX53",
          serialNumber: "DEMO-MIC-0001",
          inServiceOn: new Date("2016-01-10T00:00:00Z"),
          expectedServiceLifeYears: 10,
          replacementReviewDueOn: new Date("2026-01-10T00:00:00Z"), // replacement review overdue
        },
      });
      const autoclaveGalle = await tx.resource.create({
        data: {
          name: "Autoclave",
          categoryId: catSter.id,
          siteId: siteGalle.id,
          sectionId: secMicro.id,
          status: ResourceStatus.ACTIVE,
          manufacturer: "Tuttnauer",
          model: "2840EL",
          serialNumber: "DEMO-AUT-0003",
          inServiceOn: new Date("2020-04-01T00:00:00Z"),
          maintenanceIntervalDays: 30,
          nextMaintenanceDueOn: addDays(todayLab, 20),
        },
      });
      const uvVis = await tx.resource.create({
        data: {
          name: "UV-Vis spectrophotometer (old)",
          categoryId: catAnal.id,
          siteId: siteGalle.id,
          sectionId: secBiochem.id,
          status: ResourceStatus.RETIRED,
          manufacturer: "Shimadzu",
          model: "UV-1800",
          serialNumber: "DEMO-SPEC-0001",
          inServiceOn: new Date("2012-04-01T00:00:00Z"),
        },
      });

      // Users
      // Managers
      const mgrColombo = await tx.user.create({
        data: {
          name: "Nadeesha Perera",
          email: "nadeesha.perera@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.MANAGER,
          siteId: siteColombo.id,
          mustChangePassword: false,
        },
      });
      const mgrKandy = await tx.user.create({
        data: {
          name: "Ruwan Jayasinghe",
          email: "ruwan.jayasinghe@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.MANAGER,
          siteId: siteKandy.id,
          mustChangePassword: false,
        },
      });
      await tx.user.create({
        data: {
          name: "Fathima Rizvi",
          email: "fathima.rizvi@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.MANAGER,
          siteId: siteGalle.id,
          mustChangePassword: false,
        },
      });

      // Staff Colombo
      const staffKasun = await tx.user.create({
        data: {
          name: "Kasun Silva",
          email: "kasun.silva@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteColombo.id,
          sectionId: secMol.id,
          mustChangePassword: false,
        },
      });
      const staffDilani = await tx.user.create({
        data: {
          name: "Dilani Fernando",
          email: "dilani.fernando@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteColombo.id,
          sectionId: secBiochem.id,
          mustChangePassword: false,
        },
      });
      const staffKavitha = await tx.user.create({
        data: {
          name: "Kavitha Rajendran",
          email: "kavitha.rajendran@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteColombo.id,
          sectionId: secMicro.id,
          mustChangePassword: false,
        },
      });
      const staffMohamed = await tx.user.create({
        data: {
          name: "Mohamed Naleem",
          email: "mohamed.naleem@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteColombo.id,
          sectionId: secHaem.id,
          mustChangePassword: false,
        },
      });
      const staffTharindu = await tx.user.create({
        data: {
          name: "Tharindu Bandara",
          email: "tharindu.bandara@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteColombo.id,
          sectionId: secAdmin.id,
          mustChangePassword: false,
        },
      });

      // Staff Kandy
      const staffChamari = await tx.user.create({
        data: {
          name: "Chamari Herath",
          email: "chamari.herath@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteKandy.id,
          sectionId: secMol.id,
          mustChangePassword: false,
        },
      });
      const staffNuwan = await tx.user.create({
        data: {
          name: "Nuwan Rathnayake",
          email: "nuwan.rathnayake@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteKandy.id,
          sectionId: secMicro.id,
          mustChangePassword: false,
        },
      });
      const staffSuresh = await tx.user.create({
        data: {
          name: "Suresh Kumar",
          email: "suresh.kumar@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteKandy.id,
          sectionId: secBiochem.id,
          mustChangePassword: false,
        },
      });

      // Staff Galle
      const staffPriyanka = await tx.user.create({
        data: {
          name: "Priyanka Ekanayake",
          email: "priyanka.ekanayake@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteGalle.id,
          sectionId: secHisto.id,
          mustChangePassword: false,
        },
      });
      const staffAshan = await tx.user.create({
        data: {
          name: "Ashan de Silva",
          email: "ashan.desilva@lab.example",
          passwordHash: demoPasswordHash,
          role: Role.STAFF,
          siteId: siteGalle.id,
          sectionId: secHaem.id,
          mustChangePassword: false,
        },
      });

      // Reservations list
      const reservations: Prisma.ReservationCreateManyInput[] = [];

      // Find specific dates for scenarios
      const pastDay10 = getPastWorkingDay(10);
      const pastDay5 = getPastWorkingDay(5);
      const pastDay3 = getPastWorkingDay(3);
      const futureDay1 = getFutureWorkingDay(1);
      const futureDay2 = getFutureWorkingDay(2);

      // Find "the next Thursday after today"
      const nextThursdayAfterToday = futureWorkingDays.find((d) => getDay(d) === 4);

      for (const day of allWorkingDays) {
        const dayOfWeek = getDay(day); // 1 = Mon, ..., 5 = Fri
        const isMon = dayOfWeek === 1;
        const isTue = dayOfWeek === 2;
        const isWed = dayOfWeek === 3;
        const isThu = dayOfWeek === 4;
        const isFri = dayOfWeek === 5;
        const isMonWedFri = isMon || isWed || isFri;
        const isTueThu = isTue || isThu;
        const isMonThu = isMon || isTue || isWed || isThu;
        const isMonWed = isMon || isWed;

        const dayYMD = format(day, "yyyy-MM-dd");

        // 1. PCR machine 1 (overdue for calibration: only past bookings to satisfy calibration rule)
        if (pastWorkingDays.includes(day)) {
          // Mon-Fri 08:00-11:00 Kasun
          reservations.push({
            resourceId: pcr1.id,
            createdById: staffKasun.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "qPCR run, respiratory panel",
            startAt: labTime(day, "08:00", timeZone),
            endAt: labTime(day, "11:00", timeZone),
          });
          // Mon-Fri 11:00-13:00 Chamari
          reservations.push({
            resourceId: pcr1.id,
            createdById: staffChamari.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "qPCR run, samples from Kandy",
            startAt: labTime(day, "11:00", timeZone),
            endAt: labTime(day, "13:00", timeZone),
          });
          // Mon-Fri 13:00-14:00 Kasun
          reservations.push({
            resourceId: pcr1.id,
            createdById: staffKasun.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Plate set-up",
            startAt: labTime(day, "13:00", timeZone),
            endAt: labTime(day, "14:00", timeZone),
          });
          // Mon,Wed,Fri 14:00-17:00 Kasun
          if (isMonWedFri) {
            reservations.push({
              resourceId: pcr1.id,
              createdById: staffKasun.id,
              kind: ReservationKind.BOOKING,
              status: ReservationStatus.CONFIRMED,
              purpose: "HBV viral load",
              startAt: labTime(day, "14:00", timeZone),
              endAt: labTime(day, "17:00", timeZone),
            });
          }
        }

        // 2. PCR machine 2
        // Tue,Thu 14:00-16:00 Kasun
        if (isTueThu) {
          const isNextThursday =
            nextThursdayAfterToday && dayYMD === format(nextThursdayAfterToday, "yyyy-MM-dd");

          if (isNextThursday) {
            reservations.push({
              resourceId: pcr2.id,
              createdById: staffKasun.id,
              kind: ReservationKind.BOOKING,
              status: ReservationStatus.CANCELLED,
              purpose: "Extraction check",
              startAt: labTime(day, "14:00", timeZone),
              endAt: labTime(day, "16:00", timeZone),
              cancelReason: "Kit delivery delayed",
              cancelledAt: labTime(day, "12:00", timeZone),
              cancelledById: staffKasun.id,
            });
          } else {
            reservations.push({
              resourceId: pcr2.id,
              createdById: staffKasun.id,
              kind: ReservationKind.BOOKING,
              status: ReservationStatus.CONFIRMED,
              purpose: "Extraction check",
              startAt: labTime(day, "14:00", timeZone),
              endAt: labTime(day, "16:00", timeZone),
            });
          }
        }

        // 3. HPLC system
        // Mon-Fri 08:30-12:30 Dilani
        const isPastDay3 = dayYMD === format(pastDay3, "yyyy-MM-dd");
        if (isPastDay3) {
          reservations.push({
            resourceId: hplc.id,
            createdById: staffDilani.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CANCELLED,
            purpose: "HbA1c batch",
            startAt: labTime(day, "08:30", timeZone),
            endAt: labTime(day, "12:30", timeZone),
            cancelReason: "Samples not ready",
            cancelledAt: labTime(day, "08:00", timeZone),
            cancelledById: staffDilani.id,
          });
        } else {
          reservations.push({
            resourceId: hplc.id,
            createdById: staffDilani.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "HbA1c batch",
            startAt: labTime(day, "08:30", timeZone),
            endAt: labTime(day, "12:30", timeZone),
          });
        }

        // Tue,Thu 18:00-06:00 Dilani Overnight HPLC run (ends next day)
        if (isTueThu) {
          const nextDay = addDays(day, 1);
          reservations.push({
            resourceId: hplc.id,
            createdById: staffDilani.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Overnight HPLC run (ends next day)",
            startAt: labTime(day, "18:00", timeZone),
            endAt: labTime(nextDay, "06:00", timeZone),
          });
        }

        // 4. Flow cytometer
        // first 10 working days only, 13:00-15:00, Mohamed, CD4 count (history only)
        const dayIndexInAll = allWorkingDays.indexOf(day);
        if (dayIndexInAll < 10) {
          reservations.push({
            resourceId: flowCytometer.id,
            createdById: staffMohamed.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "CD4 count",
            startAt: labTime(day, "13:00", timeZone),
            endAt: labTime(day, "15:00", timeZone),
          });
        }

        // 5. Fluorescence micr.
        // Tue,Thu 14:00-16:00 Kavitha Auramine smear reading
        if (isTueThu) {
          reservations.push({
            resourceId: fluorMicr.id,
            createdById: staffKavitha.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Auramine smear reading",
            startAt: labTime(day, "14:00", timeZone),
            endAt: labTime(day, "16:00", timeZone),
          });
        }

        // 6. Biosafety cabinet A
        // Mon-Fri 08:00-10:00 Kavitha
        reservations.push({
          resourceId: bscA.id,
          createdById: staffKavitha.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Culture plate work",
          startAt: labTime(day, "08:00", timeZone),
          endAt: labTime(day, "10:00", timeZone),
        });
        // Tue,Thu 10:00-12:00 Mohamed Blood culture subculture
        if (isTueThu) {
          reservations.push({
            resourceId: bscA.id,
            createdById: staffMohamed.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Blood culture subculture",
            startAt: labTime(day, "10:00", timeZone),
            endAt: labTime(day, "12:00", timeZone),
          });
        }
        // Mon,Wed 14:00-17:00 Kavitha Sensitivity testing
        if (isMonWed) {
          reservations.push({
            resourceId: bscA.id,
            createdById: staffKavitha.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Sensitivity testing",
            startAt: labTime(day, "14:00", timeZone),
            endAt: labTime(day, "17:00", timeZone),
          });
        }

        // 7. Biosafety cabinet B
        // Mon-Thu 11:30-12:30 Kasun Sample prep for PCR
        if (isMonThu) {
          reservations.push({
            resourceId: bscB.id,
            createdById: staffKasun.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Sample prep for PCR",
            startAt: labTime(day, "11:30", timeZone),
            endAt: labTime(day, "12:30", timeZone),
          });
        }

        // 8. Autoclave 1
        // Mon,Wed,Fri 12:00-13:30 Kavitha Media sterilisation
        if (isMonWedFri) {
          reservations.push({
            resourceId: autoclave1.id,
            createdById: staffKavitha.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Media sterilisation",
            startAt: labTime(day, "12:00", timeZone),
            endAt: labTime(day, "13:30", timeZone),
          });
        }

        // 9. Training room
        // Fri 09:00-12:00 Nadeesha Monthly quality training (15 attendees)
        if (isFri) {
          reservations.push({
            resourceId: trainingRoom.id,
            createdById: mgrColombo.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Monthly quality training",
            attendeeCount: 15,
            startAt: labTime(day, "09:00", timeZone),
            endAt: labTime(day, "12:00", timeZone),
          });
        }

        // 10. Sample van 1
        // Mon,Wed,Fri 08:00-13:00 Tharindu Sample run Colombo to Kandy
        if (isMonWedFri) {
          reservations.push({
            resourceId: van1.id,
            createdById: staffTharindu.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Sample run Colombo to Kandy",
            startAt: labTime(day, "08:00", timeZone),
            endAt: labTime(day, "13:00", timeZone),
          });
        }

        // 11. PCR machine (Kandy)
        // Mon-Thu 14:00-16:00 Chamari qPCR run
        if (isMonThu) {
          reservations.push({
            resourceId: pcrKandy.id,
            createdById: staffChamari.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "qPCR run",
            startAt: labTime(day, "14:00", timeZone),
            endAt: labTime(day, "16:00", timeZone),
          });
        }

        // 12. Biosafety cab. (Kandy)
        // Mon-Fri 09:00-11:00 Nuwan Culture work
        reservations.push({
          resourceId: bscKandy.id,
          createdById: staffNuwan.id,
          kind: ReservationKind.BOOKING,
          status: ReservationStatus.CONFIRMED,
          purpose: "Culture work",
          startAt: labTime(day, "09:00", timeZone),
          endAt: labTime(day, "11:00", timeZone),
        });

        // 13. Meeting room (Kandy)
        // Wed 14:00-15:00 Ruwan Staff meeting (8 attendees)
        if (isWed) {
          reservations.push({
            resourceId: meetingRoomKandy.id,
            createdById: mgrKandy.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Staff meeting",
            attendeeCount: 8,
            startAt: labTime(day, "14:00", timeZone),
            endAt: labTime(day, "15:00", timeZone),
          });
        }

        // 14. Sample van 2
        // Tue,Thu 07:00-12:00 Suresh Sample run Kandy to Colombo
        if (isTueThu) {
          reservations.push({
            resourceId: van2.id,
            createdById: staffSuresh.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Sample run Kandy to Colombo",
            startAt: labTime(day, "07:00", timeZone),
            endAt: labTime(day, "12:00", timeZone),
          });
        }

        // 15. Microscope (Galle)
        // Mon 10:00-11:00 Priyanka Slide review
        if (isMon) {
          reservations.push({
            resourceId: micrGalle.id,
            createdById: staffPriyanka.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Slide review",
            startAt: labTime(day, "10:00", timeZone),
            endAt: labTime(day, "11:00", timeZone),
          });
        }

        // 16. Autoclave (Galle)
        // Wed 09:00-10:00 Ashan Sterilisation
        if (isWed) {
          reservations.push({
            resourceId: autoclaveGalle.id,
            createdById: staffAshan.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Sterilisation",
            startAt: labTime(day, "09:00", timeZone),
            endAt: labTime(day, "10:00", timeZone),
          });
        }

        // 17. UV-Vis spectrophotometer
        // first 5 working days only, 10:00-11:00, Ashan, Absorbance check (history only)
        if (dayIndexInAll < 5) {
          reservations.push({
            resourceId: uvVis.id,
            createdById: staffAshan.id,
            kind: ReservationKind.BOOKING,
            status: ReservationStatus.CONFIRMED,
            purpose: "Absorbance check",
            startAt: labTime(day, "10:00", timeZone),
            endAt: labTime(day, "11:00", timeZone),
          });
        }
      }

      // Extra Maintenance Scenarios:
      // HPLC: MAINTENANCE by Nadeesha, "Annual calibration (service engineer)", 14:00-16:00 on the 2nd working day after today
      reservations.push({
        resourceId: hplc.id,
        createdById: mgrColombo.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Annual calibration (service engineer)",
        startAt: labTime(futureDay2, "14:00", timeZone),
        endAt: labTime(futureDay2, "16:00", timeZone),
      });

      // HPLC: "Preventive maintenance" 14:00-17:00 on the 10th working day before today
      reservations.push({
        resourceId: hplc.id,
        createdById: mgrColombo.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Preventive maintenance",
        startAt: labTime(pastDay10, "14:00", timeZone),
        endAt: labTime(pastDay10, "17:00", timeZone),
      });

      // Biosafety cabinet (Kandy): MAINTENANCE by Ruwan, "Filter change", 13:00-15:00 on the 5th working day before today
      reservations.push({
        resourceId: bscKandy.id,
        createdById: mgrKandy.id,
        kind: ReservationKind.MAINTENANCE,
        status: ReservationStatus.CONFIRMED,
        purpose: "Filter change",
        startAt: labTime(pastDay5, "13:00", timeZone),
        endAt: labTime(pastDay5, "15:00", timeZone),
      });

      // Flow cytometer: Mohamed's bookings 13:00-15:00 on the 1st and 2nd working days after today,
      // CANCELLED by Nadeesha with reason "Resource out of service: laser fault, engineer visit pending"
      reservations.push({
        resourceId: flowCytometer.id,
        createdById: staffMohamed.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CANCELLED,
        purpose: "CD4 count",
        startAt: labTime(futureDay1, "13:00", timeZone),
        endAt: labTime(futureDay1, "15:00", timeZone),
        cancelReason: "Resource out of service: laser fault, engineer visit pending",
        cancelledAt: labTime(futureDay1, "09:00", timeZone),
        cancelledById: mgrColombo.id,
      });

      reservations.push({
        resourceId: flowCytometer.id,
        createdById: staffMohamed.id,
        kind: ReservationKind.BOOKING,
        status: ReservationStatus.CANCELLED,
        purpose: "CD4 count",
        startAt: labTime(futureDay2, "13:00", timeZone),
        endAt: labTime(futureDay2, "15:00", timeZone),
        cancelReason: "Resource out of service: laser fault, engineer visit pending",
        cancelledAt: labTime(futureDay1, "09:00", timeZone),
        cancelledById: mgrColombo.id,
      });

      // Insert all reservations
      await tx.reservation.createMany({
        data: reservations,
      });

      // Equipment care history records (demo values matching ISO 15189 schedules)
      const equipmentRecords: Prisma.EquipmentRecordCreateManyInput[] = [
        // 1. PCR machine 1: PASS calibration 368 days ago -> due 3 days ago (overdue)
        {
          resourceId: pcr1.id,
          kind: EquipmentRecordKind.CALIBRATION,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 368),
          performedBy: "Bio-Rad Field Service",
          reference: "CERT-PCR-2025-01",
          nextDueOn: subDays(todayLab, 3),
          recordedById: mgrColombo.id,
        },
        // 2. PCR machine 2: PASS calibration 100 days ago
        {
          resourceId: pcr2.id,
          kind: EquipmentRecordKind.CALIBRATION,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 100),
          performedBy: "Applied Biosystems Specialist",
          reference: "CERT-PCR-2026-02",
          nextDueOn: addDays(todayLab, 265),
          recordedById: mgrColombo.id,
        },
        // 3. Biosafety cabinet A (Colombo): PASS calibration 355 days ago -> due in ~10 days (Due soon)
        {
          resourceId: bscA.id,
          kind: EquipmentRecordKind.CALIBRATION,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 355),
          performedBy: "Clean Air Certification Services",
          reference: "BSC-CERT-2025-A",
          nextDueOn: addDays(todayLab, 10),
          recordedById: mgrColombo.id,
        },
        // 4. Biosafety cabinet B (Colombo): PASS calibration 365 days ago -> due TODAY!
        {
          resourceId: bscB.id,
          kind: EquipmentRecordKind.CALIBRATION,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 365),
          performedBy: "Clean Air Certification Services",
          reference: "BSC-CERT-2025-B",
          nextDueOn: todayLab,
          recordedById: mgrColombo.id,
        },
        // 5. Biosafety cabinet (Kandy): PASS calibration 355 days ago -> due in ~10 days (Due soon)
        {
          resourceId: bscKandy.id,
          kind: EquipmentRecordKind.CALIBRATION,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 355),
          performedBy: "Clean Air Certification Services",
          reference: "BSC-CERT-2025-K",
          nextDueOn: addDays(todayLab, 10),
          recordedById: mgrKandy.id,
        },
        // 6. Autoclave (Kandy): PASS preventive maintenance 30 days ago -> due TODAY!
        {
          resourceId: autoclaveKandy.id,
          kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 30),
          performedBy: "Meditech Service Engineers",
          reference: "MAINT-AUT-2026-09",
          nextDueOn: todayLab,
          recordedById: mgrKandy.id,
        },
        // 7. HPLC system: PASS calibration 60 days ago
        {
          resourceId: hplc.id,
          kind: EquipmentRecordKind.CALIBRATION,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 60),
          performedBy: "Agilent Technologies",
          reference: "HPLC-CAL-2026-08",
          nextDueOn: addDays(todayLab, 120),
          recordedById: mgrColombo.id,
        },
        // 8. HPLC system: PASS preventive maintenance 60 days ago
        {
          resourceId: hplc.id,
          kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 60),
          performedBy: "Agilent Technologies",
          reference: "HPLC-PM-2026-08",
          nextDueOn: addDays(todayLab, 120),
          recordedById: mgrColombo.id,
        },
        // 9. Real-time PCR machine (Kandy): FAIL performance check 2 days ago -> OUT_OF_SERVICE (Failed)
        {
          resourceId: pcrKandy.id,
          kind: EquipmentRecordKind.PERFORMANCE_CHECK,
          outcome: EquipmentOutcome.FAIL,
          performedOn: subDays(todayLab, 2),
          performedBy: "Ruwan Jayasinghe",
          notes: "Optical sensor failure on channel 2. Awaiting vendor replacement part.",
          recordedById: mgrKandy.id,
        },
        // 10. Sample transport van 1: PASS vehicle service 30 days ago
        {
          resourceId: van1.id,
          kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 30),
          performedBy: "Toyota Lanka",
          reference: "TOY-SRV-2026-09",
          nextDueOn: addDays(todayLab, 60),
          recordedById: mgrColombo.id,
        },
        // 11. Sample transport van 2: PASS vehicle service 45 days ago
        {
          resourceId: van2.id,
          kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
          outcome: EquipmentOutcome.PASS,
          performedOn: subDays(todayLab, 45),
          performedBy: "Associated Motorways",
          reference: "AMW-SRV-2026-08",
          nextDueOn: addDays(todayLab, 45),
          recordedById: mgrKandy.id,
        },
      ];

      await tx.equipmentRecord.createMany({
        data: equipmentRecords,
      });
    },
    { timeout: 30000 },
  );

  // Print counts and sign-in emails
  const [siteCount, sectionCount, categoryCount, resourceCount, userCount, resCount] =
    await Promise.all([
      prisma.site.count(),
      prisma.section.count(),
      prisma.category.count(),
      prisma.resource.count(),
      prisma.user.count(),
      prisma.reservation.count(),
    ]);

  console.log("\n--- Seed Completed Successfully ---");
  console.log(`Sites: ${siteCount}`);
  console.log(`Sections: ${sectionCount}`);
  console.log(`Categories: ${categoryCount}`);
  console.log(`Resources: ${resourceCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`Reservations: ${resCount}`);
  console.log("\nDemo Sign-in Emails:");
  console.log(`Admin: ${adminEmail}`);
  console.log("Managers:");
  console.log("  Colombo: nadeesha.perera@lab.example");
  console.log("  Kandy:   ruwan.jayasinghe@lab.example");
  console.log("  Galle:   fathima.rizvi@lab.example");
  console.log("Staff:");
  console.log(
    "  Colombo: kasun.silva@lab.example, dilani.fernando@lab.example, kavitha.rajendran@lab.example, mohamed.naleem@lab.example, tharindu.bandara@lab.example",
  );
  console.log(
    "  Kandy:   chamari.herath@lab.example, nuwan.rathnayake@lab.example, suresh.kumar@lab.example",
  );
  console.log("  Galle:   priyanka.ekanayake@lab.example, ashan.desilva@lab.example");
  console.log("------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
