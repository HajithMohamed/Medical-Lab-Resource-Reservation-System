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

// Demo accounts the README and tests rely on. Used to repair a database whose
// sites already exist (for example sites created by hand before seeding).
const DEMO_ACCOUNTS: Array<{
  name: string;
  email: string;
  role: Role;
  site: string;
  section?: string;
}> = [
  {
    name: "Nadeesha Perera",
    email: "nadeesha.perera@lab.example",
    role: Role.MANAGER,
    site: "Main Laboratory, Colombo",
  },
  {
    name: "Ruwan Jayasinghe",
    email: "ruwan.jayasinghe@lab.example",
    role: Role.MANAGER,
    site: "Kandy Branch Laboratory",
  },
  {
    name: "Fathima Rizvi",
    email: "fathima.rizvi@lab.example",
    role: Role.MANAGER,
    site: "Galle Branch Laboratory",
  },
  {
    name: "Kasun Silva",
    email: "kasun.silva@lab.example",
    role: Role.STAFF,
    site: "Main Laboratory, Colombo",
    section: "Molecular Diagnostics",
  },
  {
    name: "Dilani Fernando",
    email: "dilani.fernando@lab.example",
    role: Role.STAFF,
    site: "Main Laboratory, Colombo",
    section: "Clinical Biochemistry",
  },
  {
    name: "Chamari Herath",
    email: "chamari.herath@lab.example",
    role: Role.STAFF,
    site: "Kandy Branch Laboratory",
    section: "Molecular Diagnostics",
  },
  {
    name: "Priyanka Ekanayake",
    email: "priyanka.ekanayake@lab.example",
    role: Role.STAFF,
    site: "Galle Branch Laboratory",
    section: "Histopathology",
  },
];

async function ensureDemoUsers(demoPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(demoPassword, BCRYPT_COST);
  let created = 0;

  for (const account of DEMO_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) continue;

    const site = await prisma.site.findFirst({ where: { name: account.site } });
    if (!site) {
      console.log(`  Skipped ${account.email}: site "${account.site}" does not exist.`);
      continue;
    }
    const section = account.section
      ? await prisma.section.findFirst({ where: { name: account.section } })
      : null;

    await prisma.user.create({
      data: {
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        siteId: site.id,
        sectionId: section?.id ?? null,
        mustChangePassword: false,
      },
    });
    created += 1;
    console.log(`  Created missing demo account ${account.email}.`);
  }

  console.log(
    created === 0
      ? "  All demo accounts already exist (passwords left unchanged)."
      : `  Created ${created} missing demo account(s) with the demo password.`,
  );
}

function buildDemoEquipmentRecords({
  pcr1,
  pcr2,
  hplc,
  flowCytometer,
  bscA,
  bscB,
  autoclave1,
  van1,
  pcrKandy,
  bscKandy,
  autoclaveKandy,
  van2,
  micrGalle,
  mgrColomboId,
  mgrKandyId,
  mgrGalleId,
  todayLab,
}: {
  pcr1?: { id: string } | null;
  pcr2?: { id: string } | null;
  hplc?: { id: string } | null;
  flowCytometer?: { id: string } | null;
  bscA?: { id: string } | null;
  bscB?: { id: string } | null;
  autoclave1?: { id: string } | null;
  van1?: { id: string } | null;
  pcrKandy?: { id: string } | null;
  bscKandy?: { id: string } | null;
  autoclaveKandy?: { id: string } | null;
  van2?: { id: string } | null;
  micrGalle?: { id: string } | null;
  mgrColomboId: string;
  mgrKandyId: string;
  mgrGalleId: string;
  todayLab: Date;
}): Prisma.EquipmentRecordCreateManyInput[] {
  const records: Prisma.EquipmentRecordCreateManyInput[] = [];

  // 1. PCR 2 (Colombo - GOOD): Calibration passed 90 days ago, due in 275 days
  if (pcr2) {
    records.push({
      resourceId: pcr2.id,
      kind: EquipmentRecordKind.CALIBRATION,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 90),
      performedBy: "Kasun Jayawardena",
      externalCompany: "Bio-Rad Laboratories Lanka",
      workPerformed:
        "96-well optical block calibration, multi-dye fluorescence filter alignment, temperature uniformity verification (95C, 60C, 50C).",
      reference: "CAL-BR-2026-092",
      notes: "All 5 optical channels within +/- 0.15 C tolerance. ISO 15189 compliance verified.",
      nextDueOn: addDays(todayLab, 275),
      recordedById: mgrColomboId,
    });
  }

  // 2. HPLC System (Colombo - GOOD): Calibration & Maintenance passed 45 days ago
  if (hplc) {
    records.push(
      {
        resourceId: hplc.id,
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: subDays(todayLab, 45),
        performedBy: "Thilak Senanayake",
        externalCompany: "Agilent Technologies Sri Lanka",
        workPerformed:
          "UV-Vis detector wavelength accuracy verification at 254 nm and 480 nm, flow rate precision check (1.000 mL/min +/- 0.005).",
        reference: "CAL-AG-2026-14",
        notes: "Baseline noise 12 uAU, within factory specifications.",
        nextDueOn: addDays(todayLab, 135),
        recordedById: mgrColomboId,
      },
      {
        resourceId: hplc.id,
        kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
        outcome: EquipmentOutcome.PASS,
        performedOn: subDays(todayLab, 45),
        performedBy: "Thilak Senanayake",
        externalCompany: "Agilent Technologies Sri Lanka",
        workPerformed:
          "Replaced quaternary pump seals, inline filter purge frit, autosampler needle wash assembly.",
        reference: "PM-AG-2026-088",
        notes: "Pressure test passed at 400 bar for 15 minutes with zero leak.",
        nextDueOn: addDays(todayLab, 135),
        recordedById: mgrColomboId,
      },
    );
  }

  // 3. Biosafety Cabinet A (Colombo - WATCH: Calibration due in 4 days)
  if (bscA) {
    records.push({
      resourceId: bscA.id,
      kind: EquipmentRecordKind.CALIBRATION,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 361),
      performedBy: "Sanjaya Bandara",
      externalCompany: "Clean Air Certification Services",
      workPerformed:
        "HEPA filter integrity testing (DOP/PAO aerosol challenge), inflow velocity profile (105 fpm), downflow velocity mapping.",
      reference: "CACS-BSC-2025-A1",
      notes: "Filter leak rate 0.002%, acceptable. Annual recertification due in 4 days.",
      nextDueOn: addDays(todayLab, 4),
      recordedById: mgrColomboId,
    });
  }

  // 4. PCR 1 (Colombo - WATCH: 1 failure in last 90 days, resolved with repair)
  if (pcr1) {
    records.push(
      {
        resourceId: pcr1.id,
        kind: EquipmentRecordKind.PERFORMANCE_CHECK,
        outcome: EquipmentOutcome.FAIL,
        performedOn: subDays(todayLab, 40),
        performedBy: "Nadeesha Perera",
        externalCompany: null,
        workPerformed:
          "Routine weekly run with positive control template and dye calibration verification.",
        notes: "Channel 3 (FAM) high background noise in well C04-C08.",
        recordedById: mgrColomboId,
      },
      {
        resourceId: pcr1.id,
        kind: EquipmentRecordKind.REPAIR,
        outcome: EquipmentOutcome.PASS,
        performedOn: subDays(todayLab, 35),
        performedBy: "Roshan Mendis",
        externalCompany: "Bio-Rad Laboratories Lanka",
        workPerformed: "Cleaned optical lens array, replaced sample block heating peltier pad 2.",
        reference: "REP-BR-2026-019",
        notes: "Background noise resolved. Control plates re-run with 100% concordance.",
        recordedById: mgrColomboId,
      },
      {
        resourceId: pcr1.id,
        kind: EquipmentRecordKind.CALIBRATION,
        outcome: EquipmentOutcome.PASS,
        performedOn: subDays(todayLab, 185),
        performedBy: "Bio-Rad Field Service",
        externalCompany: "Bio-Rad Laboratories Lanka",
        workPerformed: "Semi-annual temperature cycling verification and optical check.",
        reference: "CAL-BR-2026-044",
        nextDueOn: addDays(todayLab, 180),
        recordedById: mgrColomboId,
      },
    );
  }

  // 5. Flow Cytometer (Colombo - POOR: OUT_OF_SERVICE with 2 repairs & 1 failure)
  if (flowCytometer) {
    records.push(
      {
        resourceId: flowCytometer.id,
        kind: EquipmentRecordKind.PERFORMANCE_CHECK,
        outcome: EquipmentOutcome.FAIL,
        performedOn: subDays(todayLab, 14),
        performedBy: "Dilani Fernando",
        externalCompany: null,
        workPerformed: "Daily 8-peak CS&T calibration bead run.",
        notes: "Blue 488nm laser power degraded below 15mW threshold. Flow cell pressure unstable.",
        recordedById: mgrColomboId,
      },
      {
        resourceId: flowCytometer.id,
        kind: EquipmentRecordKind.REPAIR,
        outcome: EquipmentOutcome.FAIL,
        performedOn: subDays(todayLab, 10),
        performedBy: "Becton Dickinson Tech",
        externalCompany: "BD Biosciences Lanka",
        workPerformed: "Replaced flow cell sheath filter and pressure regulator.",
        notes: "Laser module needs factory replacement. Resource taken out of service.",
        recordedById: mgrColomboId,
      },
      {
        resourceId: flowCytometer.id,
        kind: EquipmentRecordKind.REPAIR,
        outcome: EquipmentOutcome.FAIL,
        performedOn: subDays(todayLab, 3),
        performedBy: "Becton Dickinson Tech",
        externalCompany: "BD Biosciences Lanka",
        workPerformed: "Laser alignment and optics bench teardown.",
        notes: "Solid-state laser failed optical alignment. Awaiting imported replacement module.",
        recordedById: mgrColomboId,
      },
    );
  }

  // 6. Biosafety Cabinet B (Colombo - POOR: Overdue calibration by 8 days)
  if (bscB) {
    records.push({
      resourceId: bscB.id,
      kind: EquipmentRecordKind.CALIBRATION,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 373),
      performedBy: "Clean Air Certification Services",
      externalCompany: "Clean Air Certification Services",
      workPerformed:
        "Annual safety certification, velocity profile check, and HEPA integrity scan.",
      reference: "CACS-BSC-2025-B4",
      notes: "Certification expired 8 days ago. Booking restricted until recertification.",
      nextDueOn: subDays(todayLab, 8),
      recordedById: mgrColomboId,
    });
  }

  // 7. Autoclave 1 (Colombo - GOOD: Maintenance passed 15 days ago)
  if (autoclave1) {
    records.push({
      resourceId: autoclave1.id,
      kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 15),
      performedBy: "Sunil Gamage",
      externalCompany: "Tuttnauer Service Lanka",
      workPerformed:
        "Replaced chamber door silicone gasket, safety relief valve functional test, steam trap overhaul.",
      reference: "PM-AUT-2026-10",
      notes:
        "Biological indicator spore test (Geobacillus stearothermophilus) showed complete kill at 121C 15 min.",
      nextDueOn: addDays(todayLab, 15),
      recordedById: mgrColomboId,
    });
  }

  // 8. Van 1 (Colombo - GOOD: Vehicle service passed 25 days ago)
  if (van1) {
    records.push({
      resourceId: van1.id,
      kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 25),
      performedBy: "Toyota Lanka Service",
      externalCompany: "Toyota Lanka",
      workPerformed:
        "Periodic 40,000 km service: synthetic oil change, brake fluid flush, coolant temperature sensor calibration for sample refrigeration unit.",
      reference: "TOY-COL-4091",
      nextDueOn: addDays(todayLab, 65),
      recordedById: mgrColomboId,
    });
  }

  // 9. Kandy PCR (Kandy - POOR: Failed performance check 2 days ago)
  if (pcrKandy) {
    records.push({
      resourceId: pcrKandy.id,
      kind: EquipmentRecordKind.PERFORMANCE_CHECK,
      outcome: EquipmentOutcome.FAIL,
      performedOn: subDays(todayLab, 2),
      performedBy: "Ruwan Jayasinghe",
      externalCompany: null,
      workPerformed: "Channel cross-talk verification and negative template control run.",
      notes: "Thermal cycle overshoot on denaturation step (>98C detected). Error code E-04.",
      recordedById: mgrKandyId,
    });
  }

  // 10. Kandy BSC (Kandy - WATCH: Calibration due in 5 days)
  if (bscKandy) {
    records.push({
      resourceId: bscKandy.id,
      kind: EquipmentRecordKind.CALIBRATION,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 360),
      performedBy: "Clean Air Certification Services",
      externalCompany: "Clean Air Certification Services",
      workPerformed: "Annual field recertification, face velocity anemometer scan.",
      reference: "CACS-KND-002",
      notes: "Inflow face velocity nominal (100 fpm). Due in 5 days.",
      nextDueOn: addDays(todayLab, 5),
      recordedById: mgrKandyId,
    });
  }

  // 11. Kandy Autoclave (Kandy - POOR: Overdue maintenance by 3 days)
  if (autoclaveKandy) {
    records.push({
      resourceId: autoclaveKandy.id,
      kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 33),
      performedBy: "Meditech Service Engineers",
      externalCompany: "Meditech Lanka",
      workPerformed: "Monthly chamber clean, pressure sensor zero calibration.",
      reference: "MAINT-AUT-2026-09",
      notes: "Overdue for monthly valve and sensor servicing.",
      nextDueOn: subDays(todayLab, 3),
      recordedById: mgrKandyId,
    });
  }

  // 12. Kandy Van 2 (Kandy - GOOD: Service passed 45 days ago)
  if (van2) {
    records.push({
      resourceId: van2.id,
      kind: EquipmentRecordKind.PREVENTIVE_MAINTENANCE,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 45),
      performedBy: "Associated Motorways",
      externalCompany: "Associated Motorways Ltd",
      workPerformed: "Routine 30,000 km maintenance and refrigeration system pressure check.",
      reference: "AMW-SRV-2026-08",
      nextDueOn: addDays(todayLab, 45),
      recordedById: mgrKandyId,
    });
  }

  // 13. Galle Microscope (Galle - GOOD: Passed check 20 days ago)
  if (micrGalle) {
    records.push({
      resourceId: micrGalle.id,
      kind: EquipmentRecordKind.PERFORMANCE_CHECK,
      outcome: EquipmentOutcome.PASS,
      performedOn: subDays(todayLab, 20),
      performedBy: "Fathima Rizvi",
      externalCompany: null,
      workPerformed:
        "Kohler illumination alignment, stage micrometer calibration (10x, 40x, 100x oil objective).",
      notes: "Image resolution and parfocality verified across all objectives.",
      recordedById: mgrGalleId,
    });
  }

  return records;
}

async function ensureDemoEquipmentRecords(dbClient: PrismaClient, todayLab: Date): Promise<void> {
  const count = await dbClient.equipmentRecord.count();
  if (count > 0) {
    console.log(`  Equipment records already present (${count} records). Leaving unchanged.`);
    return;
  }

  console.log("  Seeding sample calibration and service records for equipment...");

  const mgrColombo = await dbClient.user.findFirst({
    where: { email: "nadeesha.perera@lab.example" },
  });
  const mgrKandy = await dbClient.user.findFirst({
    where: { email: "ruwan.jayasinghe@lab.example" },
  });
  const mgrGalle = await dbClient.user.findFirst({
    where: { email: "fathima.rizvi@lab.example" },
  });

  if (!mgrColombo || !mgrKandy || !mgrGalle) {
    console.log("  Could not locate demo managers to record equipment records. Skipping.");
    return;
  }

  const pcr1 = await dbClient.resource.findFirst({
    where: { name: "Real-time PCR machine 1", site: { name: "Main Laboratory, Colombo" } },
  });
  const pcr2 = await dbClient.resource.findFirst({
    where: { name: "Real-time PCR machine 2", site: { name: "Main Laboratory, Colombo" } },
  });
  const hplc = await dbClient.resource.findFirst({
    where: { name: "HPLC system", site: { name: "Main Laboratory, Colombo" } },
  });
  const flowCytometer = await dbClient.resource.findFirst({
    where: { name: "Flow cytometer", site: { name: "Main Laboratory, Colombo" } },
  });
  const bscA = await dbClient.resource.findFirst({
    where: { name: "Biosafety cabinet A (Class II)", site: { name: "Main Laboratory, Colombo" } },
  });
  const bscB = await dbClient.resource.findFirst({
    where: { name: "Biosafety cabinet B (Class II)", site: { name: "Main Laboratory, Colombo" } },
  });
  const autoclave1 = await dbClient.resource.findFirst({
    where: { name: "Autoclave 1", site: { name: "Main Laboratory, Colombo" } },
  });
  const van1 = await dbClient.resource.findFirst({
    where: { name: "Sample transport van 1", site: { name: "Main Laboratory, Colombo" } },
  });
  const pcrKandy = await dbClient.resource.findFirst({
    where: { name: "Real-time PCR machine", site: { name: "Kandy Branch Laboratory" } },
  });
  const bscKandy = await dbClient.resource.findFirst({
    where: { name: "Biosafety cabinet", site: { name: "Kandy Branch Laboratory" } },
  });
  const autoclaveKandy = await dbClient.resource.findFirst({
    where: { name: "Autoclave", site: { name: "Kandy Branch Laboratory" } },
  });
  const van2 = await dbClient.resource.findFirst({
    where: { name: "Sample transport van 2", site: { name: "Kandy Branch Laboratory" } },
  });
  const micrGalle = await dbClient.resource.findFirst({
    where: { name: "Microscope", site: { name: "Galle Branch Laboratory" } },
  });

  // Update details and schedule dates to ensure distinct GOOD / WATCH / POOR condition states
  if (pcr1) {
    await dbClient.resource.update({
      where: { id: pcr1.id },
      data: {
        manufacturer: "Bio-Rad",
        model: "CFX96 Touch",
        serialNumber: "DEMO-PCR-0001",
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDays(todayLab, 180),
      },
    });
  }
  if (pcr2) {
    await dbClient.resource.update({
      where: { id: pcr2.id },
      data: {
        manufacturer: "Applied Biosystems",
        model: "QuantStudio 5",
        serialNumber: "DEMO-PCR-0002",
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDays(todayLab, 275),
      },
    });
  }
  if (hplc) {
    await dbClient.resource.update({
      where: { id: hplc.id },
      data: {
        manufacturer: "Agilent Technologies",
        model: "1260 Infinity II",
        serialNumber: "DEMO-HPLC-0001",
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: addDays(todayLab, 135),
        maintenanceIntervalDays: 180,
        nextMaintenanceDueOn: addDays(todayLab, 135),
      },
    });
  }
  if (flowCytometer) {
    await dbClient.resource.update({
      where: { id: flowCytometer.id },
      data: {
        status: ResourceStatus.OUT_OF_SERVICE,
        manufacturer: "BD Biosciences",
        model: "FACSCanto II",
        serialNumber: "DEMO-CYTO-0001",
        calibrationIntervalDays: 180,
        nextCalibrationDueOn: addDays(todayLab, 90),
      },
    });
  }
  if (bscA) {
    await dbClient.resource.update({
      where: { id: bscA.id },
      data: {
        manufacturer: "Thermo Fisher Scientific",
        model: "1300 Series A2",
        serialNumber: "DEMO-BSC-0001",
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDays(todayLab, 4),
      },
    });
  }
  if (bscB) {
    await dbClient.resource.update({
      where: { id: bscB.id },
      data: {
        manufacturer: "Esco",
        model: "Airstream Class II",
        serialNumber: "DEMO-BSC-0002",
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: subDays(todayLab, 8),
      },
    });
  }
  if (autoclave1) {
    await dbClient.resource.update({
      where: { id: autoclave1.id },
      data: {
        manufacturer: "Tuttnauer",
        model: "3870EL",
        serialNumber: "DEMO-AUT-0001",
        maintenanceIntervalDays: 30,
        nextMaintenanceDueOn: addDays(todayLab, 15),
      },
    });
  }
  if (van1) {
    await dbClient.resource.update({
      where: { id: van1.id },
      data: {
        manufacturer: "Toyota",
        model: "HiAce",
        serialNumber: "CP-PA-4091",
        maintenanceIntervalDays: 90,
        nextMaintenanceDueOn: addDays(todayLab, 65),
      },
    });
  }
  if (pcrKandy) {
    await dbClient.resource.update({
      where: { id: pcrKandy.id },
      data: {
        manufacturer: "Bio-Rad",
        model: "CFX96",
        serialNumber: "DEMO-PCR-0003",
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDays(todayLab, 180),
      },
    });
  }
  if (bscKandy) {
    await dbClient.resource.update({
      where: { id: bscKandy.id },
      data: {
        manufacturer: "Esco",
        model: "Class II",
        serialNumber: "DEMO-BSC-0003",
        calibrationIntervalDays: 365,
        nextCalibrationDueOn: addDays(todayLab, 5),
      },
    });
  }
  if (autoclaveKandy) {
    await dbClient.resource.update({
      where: { id: autoclaveKandy.id },
      data: {
        manufacturer: "Tuttnauer",
        model: "3870EL",
        serialNumber: "DEMO-AUT-0002",
        maintenanceIntervalDays: 30,
        nextMaintenanceDueOn: subDays(todayLab, 3),
      },
    });
  }
  if (van2) {
    await dbClient.resource.update({
      where: { id: van2.id },
      data: {
        manufacturer: "Nissan",
        model: "NV350 Caravan",
        serialNumber: "CP-PA-5091",
        maintenanceIntervalDays: 90,
        nextMaintenanceDueOn: addDays(todayLab, 45),
      },
    });
  }
  if (micrGalle) {
    await dbClient.resource.update({
      where: { id: micrGalle.id },
      data: {
        manufacturer: "Olympus",
        model: "BX53",
        serialNumber: "DEMO-MIC-0001",
      },
    });
  }

  const records = buildDemoEquipmentRecords({
    pcr1,
    pcr2,
    hplc,
    flowCytometer,
    bscA,
    bscB,
    autoclave1,
    van1,
    pcrKandy,
    bscKandy,
    autoclaveKandy,
    van2,
    micrGalle,
    mgrColomboId: mgrColombo.id,
    mgrKandyId: mgrKandy.id,
    mgrGalleId: mgrGalle.id,
    todayLab,
  });

  if (records.length > 0) {
    await dbClient.equipmentRecord.createMany({ data: records });
    console.log(`  Seeded ${records.length} sample equipment calibration & service records.`);
  }
}

async function main() {
  console.log("Seeding database...");

  const timeZone = seedEnv.APP_TIME_ZONE;
  const nowInLab = new TZDate(new Date(), timeZone);
  const todayLab = new TZDate(
    nowInLab.getFullYear(),
    nowInLab.getMonth(),
    nowInLab.getDate(),
    timeZone,
  );

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
    console.log("Demo sites already present. Checking that every demo account exists...");
    await ensureDemoUsers(seedEnv.SEED_DEMO_PASSWORD!);
    await ensureDemoEquipmentRecords(prisma, todayLab);
    console.log("Run npm run db:reset to rebuild all demo data from scratch.");
    return;
  }

  console.log("Creating demo data for three-site lab network inside a transaction...");

  const demoPassword = seedEnv.SEED_DEMO_PASSWORD!;
  const demoPasswordHash = await bcrypt.hash(demoPassword, BCRYPT_COST);

  // Calculate working days in APP_TIME_ZONE
  // 20 working days before today, today if working day, 5 working days after today

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
      const mgrGalle = await tx.user.create({
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
      const equipmentRecords = buildDemoEquipmentRecords({
        pcr1,
        pcr2,
        hplc,
        flowCytometer,
        bscA,
        bscB,
        autoclave1,
        van1,
        pcrKandy,
        bscKandy,
        autoclaveKandy,
        van2,
        micrGalle,
        mgrColomboId: mgrColombo.id,
        mgrKandyId: mgrKandy.id,
        mgrGalleId: mgrGalle.id,
        todayLab,
      });

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
