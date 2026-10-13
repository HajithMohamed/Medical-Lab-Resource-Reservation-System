# Architecture Decision Records

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
