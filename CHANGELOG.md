# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project setup: TypeScript, Tailwind CSS, ESLint, Prettier, Vitest, environment files, local PostgreSQL (Docker) and CI.
- Database schema with Prisma ORM 7.10.0, models, enums and relationships.
- Hand-written PostgreSQL exclusion constraint (`reservations_no_overlap`) for clash-free reservations and database CHECK constraints.
- Database client singleton, error helper utilities, and `/api/health` check endpoint.
- Realistic seed dataset for a three-site laboratory network with recurring bookings, maintenance blocks, and cancellations.
- Integration test suite verifying exclusion and CHECK constraints.
- UI foundation: shadcn/ui components on Radix with custom lab tokens, self-hosted Atkinson Hyperlegible Next font, and brand assets.
- App shell with responsive sidebar, accessible breadcrumb, role-filtered navigation, and user menu.
- Shared components: PageHeader, ResourceStatusTag, CategoryIcon, EmptyState, ConfirmAction, NoticeToast, FilterBar, SummaryStrip, and UtilisationBar.
- Styleguide route (`/styleguide`) showcasing controls, pills, alerts, status tags, and calendar grid against design reference.
- Stateless JWT session management with `jose` stored in Secure, HttpOnly cookies (`src/lib/session.ts`).
- Data Access Layer in `src/lib/auth.ts` (`getCurrentUser`, `requireUser`, `requireRole`) with React `cache()`.
- Password hashing with `bcryptjs`, NIST SP 800-63B-4 validation, common password list, and temporary password generator (`src/lib/password.ts`).
- Pure permission helpers in `src/lib/permissions.ts` (`isAdmin`, `isManagerOrAdmin`, `canManageSite`).
- Authentication service with brute-force mitigation, account lockout after 5 failed attempts, and row-level locking.
- Server Actions for login, logout, and password change (`src/actions/auth.ts`).
- Optimistic authentication proxy (`src/proxy.ts`).
- Two-column sign-in screen matching design reference, forced password change screen with live character counter, and authenticated AppShell integration.
- Unit and integration test suites covering password rules, role permissions, and lockout scenarios.
- Admin Settings management service in `src/services/settings.ts` (`server-only`) for Sites, Sections, and Categories with strict Admin-only authorization, Zod validation, unique constraint handling (P2002), and in-use delete prevention with P2003 safety net.
- Pure booking rule helper `checkCategoryLimit(minutes)` in `src/lib/booking-rules.ts` and duration formatter `formatMinutes(minutes)` in `src/lib/format.ts`.
- Server Actions in `src/actions/settings.ts` enforcing `requireRole("ADMIN")`, path revalidation, and status messages.
- Settings hub (`/settings`) with single overview panel displaying total counts, and full CRUD list and edit pages for Sites, Sections, and Categories with modal Add dialogs, live duration hints, and `ConfirmAction` delete protection.
- Unit tests for category limit rules and minute formatting, plus integration tests for admin CRUD, duplicate names, in-use delete prevention, and role rejection.
- Timezone-aware lab date and time helpers in `src/lib/time.ts` (`server-only`) supporting dynamic time zones (default `Asia/Colombo`), slot calculations, and relative formatting.
- Pure permission helpers `rolesActorCanCreate(actor)` and `canManageUser(actor, target)` in `src/lib/permissions.ts`.
- User management service in `src/services/users.ts` (`server-only`) supporting site-scoped manager access, NIST temporary password generation, password resets, and transaction-safe deactivation with booking cancellation and last-admin protections.
- Server Actions in `src/actions/users.ts` enforcing `requireRole("MANAGER", "ADMIN")`, path revalidations, and secure temporary password delivery.
- User management interface: `/users` directory table with avatar initials, relative last sign-in, status pills (`Active`, `Must change password`, `Locked`, `Inactive`), admin FilterBar, and row action menu; `/users/new` with temporary password reveal panel; `/users/[id]` with edit form and `ConfirmAction` password reset and deactivation dialogs.
- Unit tests for timezone conversions and role permissions; integration tests for manager site isolation, role promotions, duplicate emails, password resets, and deactivation cascades.
