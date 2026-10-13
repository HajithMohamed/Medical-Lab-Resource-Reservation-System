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
