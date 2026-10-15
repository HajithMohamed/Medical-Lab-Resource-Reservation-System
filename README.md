# BenchBook — Lab Resource Reservation System

BenchBook gives everyone in a medical laboratory network one live schedule for shared instruments, biosafety cabinets, rooms and sample-transport vans. Bookings can never clash, equipment that is broken or overdue for calibration cannot be booked, people are told when something changes, and managers can see how resources are really used.

**Links:** [ER diagram](ER_DIAGRAM_URL) · [Demo video](DEMO_VIDEO_URL) · [Problem statement (PDF)](docs/problem-statement.pdf) · [Design decisions](docs/decisions.md) · [Permissions](docs/permissions.md)

> Built for the PrimeWave Lab Software Engineering Internship technical assessment (October 2026).

---

## Contents

1. [The problem](#1-the-problem)
2. [Quick start](#2-quick-start)
3. [Demo accounts](#3-demo-accounts)
4. [Features](#4-features)
5. [Roles](#5-roles)
6. [Tech stack](#6-tech-stack)
7. [Authentication and security](#7-authentication-and-security)
8. [Architecture and key decisions](#8-architecture-and-key-decisions)
9. [Database](#9-database)
10. [Project structure](#10-project-structure)
11. [Scripts](#11-scripts)
12. [Testing and CI](#12-testing-and-ci)
13. [Troubleshooting](#13-troubleshooting)
14. [Scope and next steps](#14-scope-and-next-steps)

---

## 1. The problem

The assessment describes an organisation that shares resources through informal messages and manual records, which leads to overlapping reservations and no clear view of availability. I applied it to the setting where this hurts most: **medical diagnostic labs**.

> Medical laboratories share a limited set of instruments, biosafety cabinets, rooms and, in lab networks, sample-transport vehicles among many staff and sections. When their use is coordinated through paper logbooks, sign-up sheets, phone calls and chat groups, nobody has one up-to-date view of what is free, what is booked and what is out of service. As a result, bookings can clash, work can be planned on equipment that is broken or due for maintenance, staff may not be told when a booked resource becomes unavailable, and managers cannot easily see which resources are overloaded and which sit idle. This costs staff time, can delay test results and makes complete equipment records hard to keep, at a time when labs face rising workloads, staff shortages and tight budgets.

**Our question:** How can we give every lab staff member one trustworthy, live view of shared resources, so that bookings never clash, unusable equipment is never booked, and managers can see how resources are really used?

**Our answer:** a web-based Resource Reservation Management System that gives all lab staff one live schedule, makes clashing bookings impossible, keeps broken and under-maintenance equipment off the schedule, and shows managers how each resource is used ([features](#4-features)).

### The problem at a glance

```mermaid
flowchart LR
    R["<b>Shared resources</b><br/>PCR machines, HPLC analysers, ELISA readers,<br/>biosafety cabinets, rooms, sample vans"]
    T["<b>Booked through</b><br/>paper logbooks, sign-up sheets,<br/>phone calls, chat groups"]
    C["<b>Core problem (P1)</b><br/>No single, up-to-date view of what is<br/>free, booked or out of service"]
    E1["P2 · Bookings can clash"]
    E2["P3 · Broken or under-maintenance<br/>equipment can be planned"]
    E3["P3 · Staff may not hear when a<br/>booked resource becomes unavailable"]
    E4["P5 · Managers cannot easily see<br/>which resources are busy or idle"]
    K["<b>What it costs</b><br/>Staff time is lost · results can be delayed ·<br/>equipment records are hard to keep complete"]
    R --> T --> C
    C --> E1 & E2 & E3 & E4
    E1 & E2 & E3 & E4 --> K
    classDef core fill:#0B3D52,stroke:#0B3D52,color:#ffffff
    classDef risk fill:#FBEEE5,stroke:#D9A585,color:#17212B
    classDef base fill:#E7F0F4,stroke:#9DBBC7,color:#17212B
    class C core
    class E1,E2,E3,E4,K risk
    class R,T base
```

### A morning without a shared schedule

_Illustrative example, not a documented incident._

| Time       | What happens                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 08:30      | A Molecular Diagnostics technologist writes “PCR, 10:00–12:00” in the paper logbook beside the real-time PCR machine.                 |
| 09:15      | A technologist at a branch lab phones the main lab, hears that the machine “looks free after 11”, and sends samples for an 11:00 run. |
| 10:30      | The service engineer arrives for a calibration visit that was agreed by phone with the lab manager.                                   |
| **Result** | Two runs and a service visit compete for one machine. One run waits until the afternoon, and no record shows how often this happens.  |

### How BenchBook answers each problem

| Problem                                                         | BenchBook's answer                                                                                         |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **P1** No single, up-to-date view                               | One live calendar and "Find a slot" across every site                                                      |
| **P2** Bookings can clash                                       | The database rejects overlapping bookings, even at the same moment                                         |
| **P3** Broken or under-maintenance equipment can be planned     | Maintenance blocks, out-of-service status, calibration due-day rule, failed checks take equipment offline |
| **P3** Staff may not hear about changes                         | Cancellations with reasons, in-app notifications and "notify me" alerts                                    |
| **P5** Managers can't see what's busy or idle                   | Usage dashboard and equipment reports                                                                      |

International lab guidance (WHO laboratory quality handbook, ISO 15189) expects labs to control equipment use, service schedules and equipment records. The full problem statement, evidence and sources are in [docs/problem-statement.pdf](docs/problem-statement.pdf).

**Scope boundary.** Patient data, test requests and results belong to the lab's LIMS (laboratory information system) and are deliberately out of scope. When an instrument is at another site, labs usually send the samples, not the people, so BenchBook schedules the sample vans and the receiving lab's instrument time.

---

## 2. Quick start

**You need:** [Node.js](https://nodejs.org/) 22.12 or newer (24 LTS recommended, see `.nvmrc`), npm, and [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

```bash
git clone https://github.com/HajithMohamed/Medical-Lab-Resource-Reservation-System.git
cd Medical-Lab-Resource-Reservation-System
npm install
npm run setup
npm run dev
```

Open **http://localhost:3000** and sign in with one of the [demo accounts](#3-demo-accounts).

`npm run setup` runs once. It starts PostgreSQL in Docker, creates the tables and database rules from the migrations, and loads the demo accounts and starter data. You do **not** need to create an `.env` file: `.env.development` is committed with local-only values.

<details>
<summary>The same setup, step by step</summary>

```bash
npm run db:up       # start PostgreSQL 17 in Docker (also creates the test database)
npm run db:deploy   # create tables and rules from prisma/migrations
npm run db:seed     # add demo accounts, sites, sections, categories and resources
```

</details>

<details>
<summary>No Docker? Use your own PostgreSQL</summary>

Create `.env.local` with your connection string (PostgreSQL 15 or newer):

```bash
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/lab_reservations"
```

Then run `npm run db:deploy`, `npm run db:seed` and `npm run dev`.

</details>

---

## 3. Demo accounts

Created automatically by the seed. **Local development only**; they come from `.env.development` and must be changed or removed for any real deployment.

| Role    | Email                 | Password                | Can do                                                                        |
| ------- | --------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| Admin   | `admin@lab.example`   | `blue-river-lamp-2026`  | Runs the whole network: sites, sections, categories, all users and resources  |
| Manager | `manager@lab.example` | `green-hill-cloud-2026` | Manages the Main Laboratory, Colombo: staff, resources, equipment care, usage |
| Staff   | `staff@lab.example`   | `amber-leaf-stone-2026` | Finds and books resources at any site; manages own bookings                   |

Need more users? Sign in as admin (any role, any site) or manager (staff at their own site) and use **Users → Add user**. Each new account gets a one-time temporary password.

**Starter data:** three sites (Colombo, Kandy, Galle), lab sections, six resource categories and about a dozen resources with calibration and service schedules. There are no bookings, so you start from a clean schedule.

---

## 4. Features

| Feature                    | What it does                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resource register**      | Instruments, cabinets, rooms and vans with category, site, section, location, status (active, out of service, retired) and equipment details.      |
| **Live calendar**          | Day view per site and week view per resource, with bookings, maintenance blocks and out-of-service equipment. Refreshes automatically.             |
| **Find a slot**            | Search by date, time, length and category across all sites; busy resources show the nearest free start times.                                      |
| **Clash-free booking**     | Overlapping bookings are rejected by the database itself. Category length limits, slot rules and the calibration due day are checked.             |
| **My bookings**            | Upcoming, past and cancelled bookings, with the reason when someone else cancelled one.                                                           |
| **Maintenance & breakdowns** | Managers block time or report a breakdown; affected bookings are listed first and cancelled together, with the reason recorded.                  |
| **Equipment care**         | Calibration and service schedules, a Today list of due and overdue work, append-only calibration/service/repair records, and a condition rating. |
| **Equipment reports**      | Condition of every instrument and a calibration and service log, with **PDF** and **CSV** downloads for audits.                                    |
| **Notifications**          | In-app bell that updates by itself: cancelled bookings, equipment taken out of service, due and overdue reminders.                                 |
| **"Notify me" alerts**     | When a resource is busy or out of service, staff can ask to be told when it becomes free.                                                          |
| **Usage dashboard**        | Utilisation, busy and idle resources, peak hours and use by section, with CSV export.                                                             |
| **Users and settings**     | Accounts with roles, temporary passwords, deactivation; sites, sections and categories with booking limits.                                       |
| **Responsive design**      | Works on desktop, tablet and phone.                                                                                                               |

---

## 5. Roles

| Role        | Scope              | Main abilities                                                                                                                                   |
| ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Staff**   | Own account        | Sees every site's availability, books resources at any site, cancels own bookings that have not started, sets "notify me" alerts.               |
| **Manager** | One site           | Everything staff can do, plus that site's staff accounts, resources, maintenance blocks, equipment care, bookings oversight and usage.           |
| **Admin**   | The whole network  | Sites, sections, categories, all users, all resources, equipment care and usage across sites. Admins do not book (separation of duties).        |

The full permission matrix is in [docs/permissions.md](docs/permissions.md).

---

## 6. Tech stack

| Area             | Choice                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router), React 19                                      |
| Language         | TypeScript                                                             |
| Database         | PostgreSQL 17                                                          |
| ORM              | Prisma 7 with `@prisma/adapter-pg`                                     |
| UI               | Tailwind CSS 4, shadcn/ui (Radix), lucide-react icons                  |
| Validation       | Zod 4 (every input is validated on the server)                         |
| Authentication   | Own session code, following the official Next.js authentication guide |
| Password hashing | bcrypt via `bcryptjs` (cost factor 12)                                 |
| Sessions         | Signed JWT (`jose`, HS256) in an httpOnly cookie                       |
| Dates and times  | date-fns + `@date-fns/tz`                                              |
| PDF reports      | `@react-pdf/renderer`                                                  |
| Testing          | Vitest (unit + integration against a real PostgreSQL)                  |
| CI               | GitHub Actions                                                         |
| Local database   | Docker Compose                                                         |

---

## 7. Authentication and security

- **No auth library.** Sign-in follows the official Next.js authentication guide (stateless session + data access layer), so every rule is visible and tested.
- **Password hashing:** bcrypt (`bcryptjs`) with cost factor 12. Hashes are never sent to the browser.
- **Password rules (NIST SP 800-63B):** 15–64 characters, checked against a list of common passwords, and must not contain the email name. No arbitrary symbol or capital-letter rules.
- **Sessions:** a JWT signed with `jose` (HS256) holding only the user id and a session version, stored in an **httpOnly**, **SameSite=Lax** cookie (**Secure** in production) that lasts one 8-hour shift.
- **Every request re-checks the user** in the database, so a deactivated user or a changed password ends the session immediately. Increasing the **session version** signs a user out everywhere.
- **Brute-force protection:** 5 wrong tries lock the account for 15 minutes. The decision runs in a short transaction that locks the user row, so parallel guesses cannot get past the limit. The error message is the same for every failure, so it never reveals whether an email exists.
- **Accounts:** no public sign-up. Admins and managers create accounts; each gets a unique temporary password, shown once, stored only as a hash, and changed at first sign-in.
- **Authorisation:** every page and server action checks the user's role and site on the server. `src/proxy.ts` is only a first filter that sends visitors without a session to the sign-in page.

---

## 8. Architecture and key decisions

```
Browser → src/app (pages) → src/actions (server actions) → src/services (rules + Prisma) → PostgreSQL
```

- **Layered folders.** Pages render, actions check the user and validate input, services hold all business rules and database access. Services never import Next.js, so they are tested directly.
- **The clash rule lives in the database.** A PostgreSQL exclusion constraint (`reservations_no_overlap`) rejects overlapping confirmed reservations, even when two people book at the same moment.
- **One transaction per multi-step change.** Taking equipment out of service, cancelling the affected bookings and notifying people happen together or not at all.
- **Maintenance is a reservation.** A maintenance block is a reservation of kind `MAINTENANCE`, so the same clash rule protects it.
- **Equipment records are append-only** (ISO 15189). Calibration, service, check and repair results are never edited or deleted; a mistake is corrected by a new record.
- **Equipment safety rules.** Bookings cannot run past an instrument's calibration due day; a failed check takes it out of service at once; it returns to service only after a passing check.
- **Nothing is deleted.** Bookings are cancelled with a reason, users are deactivated, resources are retired.
- **Times** are stored in UTC and shown in the lab time zone (`APP_TIME_ZONE`, Asia/Colombo).
- **Live updates by polling** (notifications and calendar), because the target hosting does not keep socket connections open.
- **Daily reminders** come from one idempotent job: `GET /api/cron/daily` (protected by `CRON_SECRET`) for hosting, or `npm run daily` locally.

All decisions with context and consequences: [docs/decisions.md](docs/decisions.md).

---

## 9. Database

| Table                      | Holds                                                                   |
| -------------------------- | ----------------------------------------------------------------------- |
| `sites`                    | Main lab and branch labs                                                |
| `sections`                 | Lab sections (Haematology, Microbiology, …)                             |
| `categories`               | Resource types with the maximum booking length                          |
| `resources`                | Bookable things, with equipment details and calibration/service dates   |
| `users`                    | Accounts, role, site, sign-in and lockout fields                        |
| `reservations`             | Bookings and maintenance blocks (one table, one clash rule)             |
| `equipment_records`        | Append-only calibration, service, check, repair and review history      |
| `notifications`            | In-app notifications per user                                           |
| `notification_preferences` | Per-user notification settings                                          |
| `resource_watches`         | "Notify me when it's free" alerts                                       |

**ER diagram:** [ER_DIAGRAM_URL](ER_DIAGRAM_URL) (source: [docs/er-diagram.dbml](docs/er-diagram.dbml)).

Rules Prisma cannot express (the exclusion constraint, CHECK constraints, partial indexes) are written by hand in the SQL files under `prisma/migrations/`.

---

## 10. Project structure

```
prisma/             schema, migrations (with hand-written SQL rules), seed
src/app/            pages and route handlers (App Router)
src/actions/        server actions: auth check → validate → one service call
src/services/       business rules and database access
src/lib/            session, auth, permissions, time, pure helpers
src/components/     UI components (shadcn/ui based)
src/config/         business numbers (rules.ts), navigation, actions
tests/unit/         pure function tests
tests/integration/  service tests against a real PostgreSQL test database
docs/               problem statement, decisions, permissions, design system, ER diagram
.github/workflows/  CI
```

---

## 11. Scripts

| Command                   | What it does                                                    |
| ------------------------- | --------------------------------------------------------------- |
| `npm run setup`           | One-time local setup: database up, migrations, seed             |
| `npm run dev`             | Start the app at http://localhost:3000                          |
| `npm run build` / `start` | Production build / run it                                       |
| `npm run db:up` / `down`  | Start / stop the local PostgreSQL container                     |
| `npm run db:deploy`       | Apply migrations                                                |
| `npm run db:seed`         | Load demo accounts and starter data (safe to run again)         |
| `npm run db:reset`        | **Delete all local data**, re-apply migrations and seed         |
| `npm run db:studio`       | Browse the database in Prisma Studio                            |
| `npm run daily`           | Run the daily reminder job once                                 |
| `npm run test`            | Unit and integration tests                                      |
| `npm run check`           | Lint, type check, format check and all tests                    |

---

## 12. Testing and CI

```bash
npm run db:up        # the test database (lab_reservations_test) is created automatically
npm run test         # unit tests, then integration tests (applies migrations to the test DB first)
npm run check        # everything CI runs except the build
```

Integration tests run against a real PostgreSQL test database, never the development one, and cover the business rules and the "not allowed" cases for each role.

**GitHub Actions** runs on every push and pull request to `develop` and `main`: lint, type check, format check, unit tests, integration tests against PostgreSQL 17, and a production build.

---

## 13. Troubleshooting

| Problem                                   | Fix                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npm run setup` fails at the database step | Start Docker Desktop and run it again.                                                      |
| Port 5432 is already in use               | Stop the other PostgreSQL, or change the port in `docker-compose.yml` and `DATABASE_URL`.     |
| Can't sign in with the demo accounts      | Run `npm run setup` (or `npm run db:seed`) — the database has no accounts yet.               |
| Start again from a clean database         | `npm run db:reset` (deletes all local data).                                                 |
| Reminders don't appear                    | Run `npm run daily`, or open Maintenance & care.                                             |

---

## 14. Scope and next steps

**Deliberately out of scope:** patient data, test requests and results (the lab's LIMS), analyser connections, stock, staff rosters, billing, email and SMS (notifications are in-app; email delivery is off).

**Possible next steps:**

- Email alerts for urgent notifications.
- A per-category setting for whether other sites can book a resource.
- Linking a booking to a LIMS batch number so samples, van runs and instrument time can be traced together.
- A second-person check on calibration results.

---

**Author:** Hajith Mohamed · PrimeWave Lab Software Engineering Internship technical assessment, October 2026.