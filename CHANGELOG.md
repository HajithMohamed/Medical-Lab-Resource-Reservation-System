# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Maintenance and breakdown management integrated into merged "Maintenance & care" (`/equipment` and `/maintenance/new`):
  - Server service `src/services/maintenance.ts` supporting clash detection (`findClashes`), block creation with atomic clashing booking cancellation (`createMaintenanceBlock`), premature completion (`endBlockNow`), future block cancellation (`cancelBlock`), block listing (`listBlocks`), and authorized resource listings (`listMaintenanceResources`).
  - Server actions `src/actions/maintenance.ts` enforcing role guards and revalidating affected routes (`/equipment`, `/maintenance`, `/calendar`, `/bookings`, `/bookings/manage`, `/overview`, `/resources/[id]`).
  - Unified "Maintenance & care" dashboard (`/equipment`) featuring three URL-backed tabs: "Today" (tasks due today / overdue with quick actions and inline "Block time" button), "Schedule" (equipment verification overview and status filtering), and "Blocked time" (upcoming and recent maintenance blocks with "End now" and "Cancel" actions, plus administrator site filter).
  - Standalone redirect for `/maintenance` directing directly to `/equipment?tab=blocked`.
  - Interactive "Block time" and "Report a breakdown" card form (`/maintenance/new`) supporting prefilled reasons (`?reason=`), immediate breakdown blocks (`?breakdown=1`), slot boundary validation, site-scoped resource selection, and a clash confirmation panel showing affected bookings before cancellation.
  - Reservation details page updates for maintenance blocks with dedicated hatch badges and authorized manager/admin action controls.
  - Navigation menu consolidation removing separate "Maintenance" item and renaming "Equipment care" to "Maintenance & care" with Wrench icon.
  - Architecture Decision Records D19 ("Maintenance is a reservation of kind MAINTENANCE") and D20 ("One Maintenance & care page").

- Live availability calendar (`/calendar`) supporting Day view per site and Week view per resource with real database schedules.
- Pure calendar grid math helpers (`rowsPerDay`, `placeOnDay`, `rowLabel`) in `src/lib/calendar-layout.ts`.
- Server-side calendar service (`src/services/calendar.ts`) providing `getSiteDay`, `getResourceWeek`, and `listCalendarOptions` with timezone normalization.
- Pure role options helper `calendarOptionsFor(user, siteId)` in `src/lib/permissions.ts`.
- Role-based slot rendering and toolbar controls: STAFF/MANAGER can click free slots to book with "+ HH:mm" hover triggers and "You" chip for own bookings; ADMIN has read-only plain cells and network-wide oversight description.
- Bookmarkable GET toolbar with segmented Day/Week links, previous/today/next steppers, site/category/resource selectors, and live update timestamp.
- Sticky time column and sticky column headers with native CSS Grid, off-hours distinction, and "Now" line indicator.
- Skeleton loading component (`src/app/(app)/calendar/loading.tsx`).
- Unit tests for calendar layout math and role options; integration tests for day/week calendar service filtering and isolation.
- Architecture Decision Record D18 ("Own calendar grid instead of a calendar library").

- Equipment care database models and migration (`equipment_records` table, enums `EquipmentRecordKind` and `EquipmentOutcome`, resource equipment fields, and 7 PostgreSQL check constraints).
- Pure equipment care rules and helpers in `src/config/equipment.ts`, `src/lib/equipment-dates.ts`, `src/lib/equipment-status.ts`, and `src/lib/booking-rules.ts`.
- Equipment care service (`src/services/equipment.ts`) and Server Actions (`src/actions/equipment.ts`) supporting append-only history, task completion (`markDone`), deferral (`markNotDone`), and overview queries.
- Shared equipment onboarding fields (`src/components/resources/equipment-fields.tsx`) integrated into resource creation and editing dialogs/forms with category-based part visibility and overdue warnings.
- Equipment Care dashboard (`/equipment`) featuring a site-scoped "Today" task list for overdue and due tasks, summary strip, filter bar, and paginated overview table.
- Resource page Equipment Care panel (`/resources/[id]`) with live calibration/maintenance tracker tags, due-day banners, quick-action dialogs, and ISO 15189 append-only history audit trail.
- "Block time" shortcut button (`src/components/equipment/block-time-button.tsx`) linking due items to maintenance block creation for authorized site managers and administrators.
- Calibration booking rule enforcing that bookings cannot run past the resource's calibration due day (`endAt <= endOfLabDay(nextCalibrationDueOn)`), with amber banner warnings on booking forms and slot finder search.
- Defective instrument isolation rule: recording a `FAIL` outcome on an active resource automatically transitions it to `OUT_OF_SERVICE`, cancels unstarted future bookings with reason, and prevents returning to `ACTIVE` until a passing check is recorded.
- Comprehensive unit and integration test suites covering equipment config, date calculations, tracker statuses, permission matrix, seed dataset, and equipment care service operations.

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
- Complete access rules, permissions matrix, and role breakdown documentation in `docs/permissions.md`.
- Pure permission functions in `src/lib/permissions.ts`: `canBook`, `canManageSettings`, `canViewUsers`, `canViewUser`, `canChangeRoleOrSite`, `canManageResource`, `canChangeResourceStatus`, `canCancelBooking`, `canManageMaintenance`, `canOverseeBookings`, `bookingOversightSitesFor`, `canViewUsage`, `usageSitesFor`.
- Bookings oversight interface at `/bookings/manage` with date range filters, site selection for administrators, resource/person filters, status toggling, and in-place cancellation with required audit reasons.
- `listBookingsForOversight` service in `src/services/bookings.ts` with pagination (`BOOKINGS_PAGE_SIZE = 25`), date range clamping (`USAGE_MAX_DAYS`), and role-based site scoping.
- Static source code access guard test suite in `tests/unit/access-guards.test.ts` verifying all Server Actions and app pages call `requireUser` or `requireRole`.
- Comprehensive table-driven permission matrix test suite in `tests/unit/permissions.test.ts` and integration suite in `tests/integration/access-control.test.ts`.

### Changed

- Enforced `[ADMIN-NO-BOOK]` separation of duties: admins manage the network and do not book (`createBooking` rejects admins; `/bookings`, `/book`, and `/bookings/new` redirect admins to `/bookings/manage`; "Book" buttons and slot booking triggers hidden for admins).
- Sidebar navigation updated in `src/config/navigation.ts`: "Bookings" added to `manage` group for `MANAGER` and `ADMIN`; "My bookings" and "Find a slot" restricted to `STAFF` and `MANAGER`.
- Resource status transitions in `src/services/resources.ts` strictly reject any changes to `RETIRED` resources (`Constraint C6: RETIRED is final`) and duplicate status requests.
- Sanitized email service in `src/lib/email.ts` to read exclusively from `env` rather than disk/process.env, and simplified password change link in `buildChangePasswordUrl` to eliminate email address query strings.
- Replaced unused `socket.io-client` with lightweight `useAutoRefresh` tab-visibility polling every 60 seconds (`CALENDAR_REFRESH_SECONDS`).

### Removed

- Removed unused `socket.io` and `socket.io-client` dependencies, `use-booking-socket.ts`, and `socket-events.ts`.

### Security

- Centralized server-side access control with pure permission functions across all Server Actions, services, and routes.
- Prevented unauthorized manager access to resources, users, and booking oversight across different sites.
