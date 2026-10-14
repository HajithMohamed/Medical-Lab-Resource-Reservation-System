<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules: Resource Reservation Management System

Rules for AI coding agents and people working in this repository. Read them
before every task. If a rule blocks you, stop and ask; do not work around it.

## 1. What we are building

A web app for a medical diagnostic lab network (a main lab and branch labs)
to share instruments, biosafety cabinets, rooms and sample-transport vans
without clashes. The problem statement is in README.md (sections 1-10) and
docs/problem-statement.pdf.

Scope of v1.0. Keep it focused; do not add features that are not listed.
1. Resource register
2. Live availability (calendar: day view per site, week view per resource)
3. Clash-free booking
4. Maintenance and breakdowns
5. Usage dashboard
plus sign-in with three roles (STAFF, MANAGER, ADMIN).
Out of scope: patient data, test orders and results (that is a LIMS),
analyser connections, stock, rosters or attendance, approval workflows,
email or SMS, billing, a mobile app.

## 2. Stack and versions (never change a major version)

- Node.js 24 LTS (22.12+ works). npm only.
- Next.js 16.4 (App Router), React 19.3, TypeScript 5.9 (never 7.x),
  Tailwind CSS 4 (loaded by @tailwindcss/turbopack in next.config.ts).
- PostgreSQL 17. Prisma ORM 7.10.0 EXACTLY for prisma, @prisma/client and
  @prisma/adapter-pg. `prisma@latest` is a Prisma 8 release candidate:
  never install it.
- zod 4, jose 6, bcryptjs 3, date-fns 4 + @date-fns/tz, server-only.
- Vitest 5, ESLint 9 (as installed by create-next-app), Prettier 3, tsx,
  cross-env.
- UI: shadcn/ui components on Radix (copied into src/components/ui by
  `npx shadcn@4 add ...`), lucide-react icons, sonner toasts, and the font
  Atkinson Hyperlegible Next, self-hosted with
  @fontsource-variable/atkinson-hyperlegible-next (no Google font
  downloads).
- Never run `npm audit fix --force`; it downgrades eslint-config-next and
  Prisma. Known advisories are explained in docs/decisions.md.

Next.js 16 reminders:
- Before using an API you are not sure about, read the guide in
  node_modules/next/dist/docs/. This version differs from older ones.
- Middleware is now src/proxy.ts and exports `proxy`.
- cookies(), headers(), params and searchParams are async: await them.
- `next lint` was removed: use `npm run lint`.
- Cache Components is OFF. Do not use "use cache", cacheLife or cacheTag.
  After a change, call revalidatePath() for the pages that show the data.

Prisma 7 reminders:
- The client is generated into src/generated/prisma (gitignored). Import it
  from "@/generated/prisma/client".
- `prisma migrate dev` does NOT run `prisma generate` or the seed. Run
  `npx prisma generate` and `npm run db:seed` yourself.
- The database URL is set in prisma.config.ts, not in schema.prisma.

## 3. Architecture: one Next.js app, layered folders

Browser -> src/app (pages) -> src/actions (Server Actions)
        -> src/services (rules + Prisma) -> PostgreSQL (constraints are the
           last guard)

- src/app: pages and layouts, Server Components by default. A page first
  calls requireUser() or requireRole(...), then reads data through
  services, then renders.
- src/components: UI. Add "use client" only for interactive parts (forms
  with useActionState, auto-refresh, menus). src/components/ui holds the
  shadcn/ui components (generated; change them only for accessibility or
  tokens). src/components/app-shell (sidebar, top bar, user menu),
  src/components/brand (logo) and shared pieces such as page-header,
  resource-status-tag, category-icon, empty-state, confirm-action,
  notice-toast, filter-bar, summary-strip and utilisation-bar.
- src/actions/<area>.ts: "use server". Each action:
  1. const user = await requireUser() (or requireRole(...))
  2. parse the FormData with a zod schema; on failure return
     { ok: false, fieldErrors }
  3. call ONE service function, passing `user` as the first argument
  4. revalidatePath(...) and/or redirect(...)
  5. return { ok: true, message } or { ok: false, error }
- src/services/<area>.ts: `import "server-only"`. All business rules and
  database access. The first parameter is the acting user (`actor`) when
  permissions matter. Return { ok: true, ... } or { ok: false, error } for
  expected problems (validation, clash, permission); throw only for bugs.
  Services NEVER import from next/* (no redirect, cookies or
  revalidatePath), so Vitest can test them directly.
- src/lib: db.ts (Prisma client), env.ts (environment variables),
  session.ts (cookie and JWT), auth.ts (Data Access Layer: getCurrentUser,
  requireUser, requireRole), password.ts, permissions.ts (pure role
  checks), time.ts (lab time zone), db-errors.ts (Prisma error checks),
  and pure helpers: booking-rules.ts, calendar-layout.ts, usage.ts.
- src/config/rules.ts: every business number, each with a comment.
- prisma/: schema.prisma, migrations/, seed.ts.
- tests/: unit/, integration/, helpers/.

## 4. Coding rules: simple and readable

- Write code a second-year student can follow: small functions, plain
  names (createBooking, cancelBooking), early returns, comments that say
  WHY. Keep files under about 200 lines; split bigger ones.
- No magic numbers or strings: use src/config/rules.ts, and Prisma enum
  values in server code (services, actions, pages). In client components
  and in shared modules they import (permissions.ts, navigation.ts), use
  string literals typed with `import type { Role } from
  "@/generated/prisma/client"`. Work out options such as "roles this
  user may create" on the server and pass them to client forms as props.
- Environment variables: read them ONLY through `env` from src/lib/env.ts,
  and document every one in .env.example. Exceptions: prisma.config.ts,
  prisma/seed.ts, playwright.config.ts and files under tests/ (they run
  outside Next.js).
- Never send passwordHash (or lockout fields) to the browser. Services
  select only the fields a page needs; passwordHash is read only where a
  password is checked or set. Actions return small plain objects such as
  { ok, message }, never whole database rows.
- Not allowed: repository pattern, dependency injection, service classes,
  global mutable state (except the documented Prisma client), Redux or
  Zustand, tRPC, GraphQL, other ORMs, UI kits other than shadcn/ui, chart or
  calendar libraries, "use cache", `any` (use `unknown` and narrow it),
  browser confirm()/alert() dialogs (use the ConfirmAction AlertDialog
  component, or a second "Yes, ..." submit button before it exists).
- The look: follow docs/design-system.md and match
  docs/design-reference.html (both arrive with the UI foundation branch,
  U1). Use token classes (bg-primary,
  text-muted-foreground, bg-booking, hatch-maint ...), never raw hex colours
  in components. Sentence case; no all-capital labels.
- Client components ("use client") never import the Prisma client at
  runtime. Use `import type` for Prisma enums and types, or plain string
  unions.
- Validate every input on the server with zod. The browser may validate
  too, but the server decides.
- Security: every page with private data and every Server Action checks the
  user and role itself; layouts and proxy.ts are NOT enough. Use
  permissions.ts. Never trust an id sent by a form: check it belongs to the
  actor's allowed site.
- Never put secrets, temporary passwords or personal data in URLs or logs.
- Dates: store UTC (timestamptz). Convert input and output with
  src/lib/time.ts, which uses env.APP_TIME_ZONE. Never parse
  "YYYY-MM-DDTHH:mm" with new Date(); it uses the server's time zone.
- Messages to users are short and friendly ("This time clashes with Kasun
  Silva's booking, Tue 13 Oct, 10:00 to 12:00."). Never show stack traces, SQL or Prisma
  messages. Log unexpected errors with console.error and some context;
  never log passwords, tokens or cookies.
- UI: accessible (every input has a <label>, buttons have text, visible
  focus, status shown with text as well as colour) and responsive (works
  at 375px wide; wide tables and grids scroll inside their own box, the
  page never scrolls sideways).

## 5. Data model (prisma/schema.prisma is the source of truth)

Tables: sites, sections, categories, resources, users, reservations.
Enums: Role (STAFF, MANAGER, ADMIN), ResourceStatus (ACTIVE,
OUT_OF_SERVICE, RETIRED), ReservationKind (BOOKING, MAINTENANCE),
ReservationStatus (CONFIRMED, CANCELLED).

- A maintenance block is a reservation with kind MAINTENANCE, so the same
  clash rule protects it.
- Nothing is deleted: reservations are cancelled (reason, who, when),
  users are deactivated, resources are retired.
- Rules written by hand in the init migration (Prisma cannot express them):
    reservations_no_overlap  EXCLUDE USING gist (resource_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&) WHERE (status = 'CONFIRMED')
    CHECK: reservations_time_order, reservations_cancel_fields,
      reservations_attendee_count_positive, resources_capacity_positive,
      categories_max_booking_minutes_positive, users_email_lowercase,
      users_site_required_unless_admin, users_failed_login_count_not_negative
- New migrations: `npx prisma migrate dev --name <name> --create-only`, then
  READ the SQL. If it drops any rule above or the btree_gist extension,
  delete those lines. Then run `npx prisma migrate dev` and
  `npx prisma generate`. Never edit a migration that is already merged into
  develop. The integration test "database rules exist" must keep passing.
- Prisma errors (check them with src/lib/db-errors.ts): with Prisma 7.10 and
  adapter-pg a clash is a PrismaClientKnownRequestError with code P2039
  whose message contains "23P01" and "reservations_no_overlap". Unique:
  P2002. Foreign key: P2003.

## 6. Roles and permissions (src/lib/permissions.ts)

- ADMIN: runs the whole network, no site, no section, does NOT book. Sets up sites, sections and categories, manages all users, oversees every site's resources, bookings, equipment and usage.
- MANAGER: belongs to one site (users.site_id). Does everything staff do, plus that site's staff accounts, resources, equipment care, maintenance, bookings oversight and usage. Cannot create managers or admins, or touch other sites.
- STAFF: has a home site and section. Finds and books resources at any site for themselves; manages own bookings.
- The full rules are in docs/permissions.md. Every new feature adds its rows there and its function to permissions.ts.
- Nobody can deactivate or demote themselves. The last active admin cannot
  be deactivated or demoted.
- canManageSite(user, siteId): ADMIN -> true; MANAGER -> user.siteId ===
  siteId; STAFF -> false.
- Changing an existing row (resource, user, reservation, block): load it
  first and check the actor may manage its STORED site; if the change moves
  it to another site, check the new site too. Never trust a siteId sent by
  the form on its own.

## 7. Business rules (the numbers are in src/config/rules.ts)

- Booking: start and end on SLOT_MINUTES marks; at least
  MIN_BOOKING_MINUTES; at most the category's max_booking_minutes; not in
  the past (counting from the start of the current slot); no further ahead
  than BOOKING_WINDOW_DAYS; the resource must be ACTIVE. Resources with a
  capacity (rooms) need an attendee count from 1 to the capacity; others
  must not have one.
- Back-to-back bookings are allowed (ranges are [start, end)).
- The Cancel button: only bookings that have not started; a reason is
  required.
- Setting a resource OUT_OF_SERVICE or RETIRED cancels its bookings that
  have not started, in one transaction, with the reason recorded.
  Maintenance blocks are not changed.
- Maintenance block: only the site's manager or an admin; no maximum
  length. EVERY confirmed booking that overlaps the block, including one
  already in progress, is listed first and cancelled only after the
  manager confirms, in one transaction together with creating the block.
- Deactivating a user cancels their bookings that have not started, in one
  transaction.
- Usage: utilisation = booked minutes inside standard hours / standard
  minutes in the period (STANDARD_WEEKDAYS, STANDARD_DAY_START_HOUR to
  STANDARD_DAY_END_HOUR, in the lab time zone).

## 8. Authentication

Follow node_modules/next/dist/docs/01-app/02-guides/authentication.md
(stateless session + Data Access Layer).
- Cookie SESSION_COOKIE_NAME holds a JWT (HS256, jose) with only
  { userId, sessionVersion }: httpOnly, secure in production, sameSite
  "lax", path "/", lasts SESSION_HOURS.
- getCurrentUser() (wrapped in React cache) verifies the cookie, loads the
  user from the database and returns null for inactive users or a
  sessionVersion mismatch. Increasing users.session_version signs a user
  out everywhere (password change or reset, deactivation).
- proxy.ts only redirects visitors without a valid token to /login. It
  never touches the database and never redirects away from /login (a
  stale token would loop). The /login page itself sends signed-in users
  to /calendar, using getCurrentUser().
- Passwords: bcryptjs with BCRYPT_COST; PASSWORD_MIN_LENGTH to
  PASSWORD_MAX_LENGTH characters and at most BCRYPT_MAX_BYTES bytes; not on
  the common-password list; must not contain the email name; no rules
  about symbols, digits or capitals.
- New accounts and resets get a unique temporary password: shown once,
  stored only as a hash, never put in a URL; must_change_password = true.
- Sign-in: the same message for every failure. bcrypt always runs (even
  for locked or inactive accounts). The decision runs in a short
  transaction that locks the user's row, so parallel guesses cannot get
  past the limit. Lockout after MAX_FAILED_LOGINS failures for
  LOCK_MINUTES.
- No public sign-up page. The first admin comes from the seed.

## 9. Testing

- Unit tests (tests/unit): pure functions such as rules, time, password,
  permissions, booking-rules, calendar-layout and usage.
- Integration tests (tests/integration): services against the real test
  database (.env.test, database lab_reservations_test). Reset the tables
  in beforeEach with tests/helpers/db.ts. Never use the development
  database for tests.
- Every feature adds tests for its rules and permissions, including the
  "not allowed" cases.
- A task is done only when `npm run check` and `npm run build` pass.

## 10. Git

- Work on the branch the developer created. Do not create, switch, push,
  merge or rebase branches, and do not change git config.
- Never run `npm run db:reset` or `prisma migrate reset`, and never set
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION. Prisma blocks resets started
  by AI agents on purpose; ask the developer to run it. On a freshly
  migrated database, `npm run db:seed` is enough.
- Commit in small steps with Conventional Commits:
  feat(scope): ..., fix(scope): ..., test(scope): ..., refactor(scope): ...,
  docs: ..., chore: ..., ci: ...
  Scopes: setup, db, auth, settings, users, resources, bookings, calendar,
  maintenance, usage, access, docs, release.
- Never commit .env.local, .env.*.local, .env.production, secrets,
  src/generated or coverage output.
- When you add a feature or make a decision, update CHANGELOG.md
  (Unreleased) and docs/decisions.md.

## 11. When you finish a task

Reply with: the files you changed, how to test the feature by hand, the
commands you ran and their results, and anything you were unsure about or
left out.

## 12. Databases: local PostgreSQL and Supabase

We use three databases. Never mix them up.

| Use | Database | Where the connection string lives |
| --- | --- | --- |
| Development: `npm run dev`, `prisma migrate dev`, `npm run db:seed` | Local PostgreSQL 17 (Docker: `npm run db:up`), database `lab_reservations` | `.env.development` (committed, local values only) |
| Automated tests | Local PostgreSQL, database `lab_reservations_test`; in CI the GitHub Actions postgres service | `.env.test` (committed) |
| Hosted demo | Supabase (PostgreSQL 17), Session pooler connection (port 5432) | `.env.supabase.local` (never committed) |

- Never write a Supabase connection string, password, host or project reference into a
  committed file, a test, a log, a commit message or a chat reply. `.env.example` shows only
  placeholders. Never open or print `.env.supabase.local`.
- Create migrations only against the local database. `prisma migrate dev` needs a temporary
  shadow database, which Supabase's pooler cannot provide.
- Apply migrations to Supabase only with `npm run supabase:deploy` (`prisma migrate deploy`).
  It never needs a shadow database and never resets data.
- Never run tests, `prisma migrate dev`, `prisma db push`, `prisma migrate reset` or
  `npm run db:reset` against Supabase. Run the `supabase:*` scripts only when the developer
  asks.
- The app code is the same for every database: `src/lib/db.ts` connects with PrismaPg and
  `env.DATABASE_URL`. The `supabase:*` scripts only set a different DATABASE_URL.
- Never set NODE_TLS_REJECT_UNAUTHORIZED or turn off TLS checks to fix a connection error.
  Stop and show the error to the developer.
