# Architectural Decision Records (ADRs)

Each entry records an architectural choice, why it was made, and what trade-offs were accepted.

## D1: One Next.js app with layered folders

- **Date:** 2026-10-12
- **Status:** accepted
- **Context:** Building a medical lab resource reservation system requires server-side rendering, secure role enforcement, and simple deployment.
- **Decision:** Build as a single Next.js App Router application with strict layered folders (`src/app`, `src/actions`, `src/services`, `src/lib`, `src/components`) without a separate backend server.
- **Consequences:** Eliminates API boilerplate and multi-repo orchestration while keeping business rules testable in isolated services. Server Actions directly invoke services.

## D2: Pinned versions and audit policy

- **Date:** 2026-10-12
- **Status:** accepted
- **Context:** Next.js 16.4, React 19, and Prisma 7 use specific tooling versions where automatic audit fix commands can downgrade or break core packages.
- **Decision:** Pin versions and never run `npm audit fix --force`. Known advisories: `braces` (used only during linting via `eslint-config-next`), `deepmerge-ts` and `mysql2` (used only on developer machines and CI via Prisma CLI; `mysql2` is unused).
- **Consequences:** Prevents unexpected breaking downgrades of Prisma or Next.js tooling. None of the advisory packages reach runtime users. Re-check when patched upstream packages are published.

## D3: Environment files per environment and runtime validation

- **Date:** 2026-10-12
- **Status:** accepted
- **Context:** Local development, tests, CI, and hosted demo need distinct database URLs and secrets without accidental leaks into Git.
- **Decision:** Use dedicated `.env` files per environment (`.env.development`, `.env.test`, `.env.example`, `.env.production.example`) and validate all variables exclusively in `src/lib/env.ts` with Zod, bypassing checks only during `next build` (`PHASE_PRODUCTION_BUILD`).
- **Consequences:** Ensures early and clear failure when variables are missing or misconfigured, while allowing static page inspection during production builds without requiring live database connections.

## D4: The clash rule lives in the database (EXCLUDE constraint)

- **Date:** 2026-10-13
- **Status:** accepted
- **Context:** Two users can book the same resource at the same moment. An application-only check can suffer from race conditions where both concurrent requests pass the check and create overlapping bookings.
- **Decision:** Place the clash rule directly in PostgreSQL using a GiST `EXCLUDE` constraint (`reservations_no_overlap`) with `btree_gist` and `tstzrange("start_at", "end_at", '[)') WITH && WHERE ("status" = 'CONFIRMED')`. The application still checks for clashes beforehand to return user-friendly error messages, but the database exclusion constraint is the ultimate guard that makes double-booking impossible.
- **Consequences:** Eliminates double-booking race conditions completely. Hand-written SQL constraint must be preserved across future Prisma migrations.

## D5: UI foundation: shadcn/ui on Radix with our tokens

- **Date:** 2026-10-13
- **Status:** accepted
- **Context:** The application serves laboratory staff, scientists, and managers requiring rapid, legible, and accessible resource scheduling on bench PCs and mobile devices.
- **Decision:** UI: shadcn/ui on Radix with our tokens; Atkinson Hyperlegible Next for legibility; Studio Admin (MIT) used as a layout reference only. Self-host the variable font via Fontsource for reliable offline builds. Map design tokens in `globals.css` using Tailwind CSS `@theme inline` without raw hex values in components.
- **Consequences:** Eliminates external network dependencies at build time. Maintains WCAG 2.2 AA contrast with 40px touch targets, visible focus rings, accessible status hang tags, and clear role-based navigation.

## D6: Own session code (the Next.js guide pattern) instead of an auth library

- **Date:** 2026-10-13
- **Status:** accepted
- **Context:** The application requires stateless session management, role enforcement, and account lockout for a closed laboratory staff network without third-party OAuth or public sign-ups. External auth libraries add schema complexity and unnecessary runtime overhead.
- **Decision:** Implement stateless sessions following the official Next.js App Router Data Access Layer pattern: signed JWTs using `jose` with HS256 stored in HttpOnly, secure, SameSite=Lax cookies, paired with a React `cache()` Data Access Layer in `src/lib/auth.ts`. Authenticate via server-only services using `bcryptjs` and row-level locking (`SELECT ... FOR UPDATE`) to protect against brute-force attacks and race conditions.
- **Consequences:** Eliminates external authentication provider dependencies and schema churn while keeping session checks lightweight, testable, and strictly bound to the database user state (including session versioning and account lockout).

## D7: A unique temporary password per account instead of a common starting password

- **Date:** 2026-10-13
- **Status:** accepted
- **Context:** Newly created laboratory accounts or manager-initiated password resets require a starting password. Common initial passwords violate NIST SP 800-63B guidelines and create credential guessing risks.
- **Decision:** Generate unique temporary passwords per account using `crypto.randomInt` over a 30-character unambiguous alphabet (`abcdefghjkmnpqrstuvwxyz23456789`, excluding confusing characters 0/O and 1/l/I) in 4 groups of 4 characters (e.g., `k7mq-x4tr-9hwz-3pfd`), requiring an immediate password change (`mustChangePassword: true`) upon initial login.
- **Consequences:** Maximizes initial account security while making temporary passwords easy to read aloud to laboratory staff without transcription errors.

## D8: In-use prevention before deletion with foreign key safety net

- **Date:** 2026-10-13
- **Status:** accepted
- **Context:** Deleting master data records (sites, sections, categories) that are still referenced by resources or users causes data loss or unhandled foreign key database errors.
- **Decision:** Check usage counts in the application layer before attempting deletion, providing a clear count-specific refusal message (e.g., "This site still has 7 resources and 5 users. Move or retire them first."). Wrap deletion in database try/catch to catch foreign key violations (`P2003`) as an extra safety net. Keep the delete confirmation dialog open on refusal to display the error inline.
- **Consequences:** Prevents dangling references and broken foreign keys while providing friendly, actionable instructions to administrators without raw database error codes.

## D9: Site-scoped managers

- **Date:** 2026-10-13
- **Status:** accepted
- **Context:** Laboratory operations require delegating user onboarding and account management to on-site managers without risking network-wide privilege escalation or leaking personnel details between sites.
- **Decision:** Establish three explicit roles (`STAFF`, `MANAGER`, `ADMIN`) with site-scoped authority:
  - `MANAGER` users can only create and manage `STAFF` assigned to their own site (`canManageUser(actor, target)`). Lookup queries for users outside their site return `null` (`not found`), ensuring IDs from other sites reveal nothing.
  - `ADMIN` users operate network-wide, can create all roles, and can transfer staff or promote managers. When a user becomes an `ADMIN`, their `siteId` is cleared; converting an `ADMIN` to `STAFF` or `MANAGER` mandates assigning a valid site.
  - Accounts use NIST-compliant temporary passwords generated on demand and shown only once. Deactivation executes as a single transaction: immediately incrementing `sessionVersion` to revoke active JWT tokens, setting `isActive: false`, and cancelling only future `CONFIRMED` bookings with an audit reason, while preserving past bookings and resource maintenance records.
  - Protection guards prevent self-deactivation and ensure the last active administrator cannot be demoted or deactivated.
- **Consequences:** Provides granular site autonomy, prevents privilege escalation, and enforces robust security boundaries across multi-site laboratory networks.

## D10: Cancelling upcoming confirmed bookings atomically inside the status transaction

- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** When a resource transitions out of service (`OUT_OF_SERVICE`) or is retired (`RETIRED`), existing future confirmed bookings would become invalid and leave users expecting unavailable equipment. If status update and booking cancellation are executed separately, a failure in between would leave an inconsistent state or ghost bookings on unavailable equipment.
- **Decision:** Execute resource status changes and booking cancellations atomically within a single Prisma transaction (`prisma.$transaction`). When transitioning to `OUT_OF_SERVICE` or `RETIRED`, identify future confirmed bookings (`status = "CONFIRMED"` and `startAt > now`), update the resource status, and transition those bookings to `CANCELLED` with a structured reason recorded in `cancelReason` (e.g., `"Resource taken out of service: <reason>"` or `"Resource retired: <reason>"`). Maintenance reservations, past bookings, and bookings on other resources remain intact.
- **Consequences:** Guarantees database consistency with zero ghost active bookings on offline resources. The status transition page displays the exact number of bookings that will be cancelled before the manager confirms the change.

## D11: Times stored in UTC, entered and shown in APP_TIME_ZONE

- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** Laboratory operations require consistent schedule boundaries across all devices and shifts. Client browsers may run on differing local system timezones, and naive date parsing (`new Date("YYYY-MM-DDTHH:mm")`) uses the local browser's clock, creating accidental slot shifting and false clash detections.
- **Decision:** Store all timestamps in PostgreSQL as `TIMESTAMPTZ` normalized to UTC. Parse all date and time inputs using `parseLabDateTime(dateStr, timeStr, zone)` via `@date-fns/tz` `TZDate`, explicitly locked to `APP_TIME_ZONE` (`Asia/Colombo` by default). Format all displayed schedule times using `formatLabRange`, `formatLabDate`, and `formatLabTime` with the lab timezone. Disallow naive parsing of local datetime strings.
- **Consequences:** Ensures zero timezone drift across staff devices, exact 15-minute slot boundary alignment, and guarantees that bookings, calendar views, and database exclusion ranges match the physical laboratory's operating day.

## D12: Search-first booking without holds

- **Date:** 2026-10-14
- **Status:** accepted
- **Context:** Users typically think 'when and what' first (date, time, duration, equipment category, attendees) rather than browsing individual instrument schedules, similar to passenger transit or ticket booking systems. Traditional hold mechanisms introduce complex hold table schemas, timeout sweeps, and seat abandonment locks.
- **Decision:** Provide a bookmarkable GET search page (`/book`) that computes cross-resource availability across all matching laboratory equipment in two batched queries. Rather than holding slots while users fill out booking details, enforce reservations at the moment of saving through the existing PostgreSQL GiST exclusion constraint (`reservations_no_overlap`). If a race condition occurs and another user confirms the slot first, the booking form gracefully intercepts the clash and immediately suggests the nearest free alternate start times computed by `slot-finder`.
- **Consequences:** Eliminates reservation hold tables, abandoned cart cleanup cron jobs, and resource locking overhead. Users can share and bookmark searches. In the rare event of a lost race, the user receives actionable instant alternatives.
