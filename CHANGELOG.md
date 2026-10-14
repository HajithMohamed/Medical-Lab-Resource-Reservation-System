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
- Resource register and management service in `src/services/resources.ts` (`server-only`) with site-scoped manager permissions, 7-day schedule view, and 5-block maintenance history.
- Bookmarkable resource register page (`/resources`) with search, site, category, section, and status filters, responsive desktop table, and mobile card view.
- Resource details page (`/resources/[id]`) with capacity display, category booking limits, manager quick actions, grouped 7-day schedule with diagonal hatch pattern for maintenance, and recent maintenance logs.
- Resource creation (`/resources/new`) and editing (`/resources/[id]/edit`) with manager site-locking, target-site permission verification, and duplicate name prevention per site.
- Resource status transition flow (`/resources/[id]/status`) that atomically cancels future confirmed bookings with recorded reason when transitioning to OUT_OF_SERVICE or RETIRED inside a single database transaction.
- Server Actions in `src/actions/resources.ts` with manager role verification, Zod input validation, and Next.js path cache revalidation.
- Integration tests in `tests/integration/resources.test.ts` covering manager site scoping, duplicate name handling, site migration permissions, atomic status cancellation, and multi-field resource filtering.
- Pure booking validation rules in `src/lib/booking-rules.ts` (`checkBookingTimes`, `checkAttendees`, `formatDurationWords`) enforcing 15-minute slot alignment, duration limits, 60-day advance window, and room capacities.
- Pure cancellation permission rules in `src/lib/permissions.ts` (`canCancelReservation`) restricting cancellation to unstarted confirmed bookings by owners or site managers.
- Clash-free booking service in `src/services/bookings.ts` (`createBooking`, `cancelBooking`, `getReservation`, `listMyBookings`) backed by PostgreSQL `EXCLUDE` constraint with user-friendly naming of clashing bookings or maintenance.
- Server Actions in `src/actions/bookings.ts` (`createBookingAction`, `cancelBookingAction`) with path cache revalidations and notice redirects.
- Real-time `socket.io-client` synchronization hook (`useBookingSocket`) for collaborative schedule updates across multiple browser tabs and laboratory terminals.
- Bookings UI adhering to Clinical Precision design system:
  - `/bookings/new` Card form (max 640px) with site-grouped selects, dynamic duration/capacity hints, and top destructive clash alerts linking to calendar.
  - `/bookings` My Bookings client with sectioned views (Upcoming, Past, Cancelled), modal creation dialog, NoticeToast notifications, soft highlight fade on `?highlight=`, and client pagination controls.
  - `/reservations/[id]` Specimen label slip with large tabular timestamps, status pills, diagonal maintenance hatching, and modal cancellation dialog with required reason.
  - Linked reservation slips across `/resources/[id]` 7-day schedule.
- Unit test suites covering booking rules and permissions; comprehensive integration test suite verifying free slot booking, named person clashes, maintenance clashes, 5-parallel concurrent race condition handling, and site-scoped cancellation rules.
- Pure slot finding helpers `isFree`, `freeStartTimes`, and `nearestStarts` in `src/lib/slot-finder.ts` for boundary-aware slot calculations and nearest alternate start suggestions.
- Cross-resource availability search service in `src/services/availability.ts` (`findSlots`) with batched resource and confirmed reservation loading, fallback-safe query sanitization, strict state prioritization, and nearest start suggestion generation.
- Find a slot search interface (`/book`) with responsive GET form, `aria-live` result banner, category duration guards, and resource cards with direct booking links and alternate time suggestions.
- Interactive lost-race clash recovery in `/bookings/new` presenting immediate alternative start time buttons on concurrency collision.
- Navigation integration adding "Find a slot" to sidebar navigation for STAFF, MANAGER, and ADMIN, and secondary toolbar button in precision calendar view.
- Unit and integration test suites for slot finding calculations, availability filtering, site scoping, query fallbacks, and lost-race handling.
