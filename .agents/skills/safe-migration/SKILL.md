---
name: safe-migration
description: Changes prisma/schema.prisma and creates a Prisma 7 migration without losing the hand-written clash rule and CHECK constraints. Use for any schema change, new table, new column, enum change or migration in this repository.
---

# Safe database migration

Prisma Migrate cannot create EXCLUDE or CHECK constraints, and it may try to drop them in later
migrations. These steps protect them.

## Protected objects (they must never be dropped)

- Extension `btree_gist`
- `reservations_no_overlap` (EXCLUDE USING gist, the clash rule)
- CHECK constraints: `reservations_time_order`, `reservations_cancel_fields`,
  `reservations_attendee_count_positive`, `resources_capacity_positive`,
  `categories_max_booking_minutes_positive`, `users_email_lowercase`,
  `users_site_required_unless_admin`, `users_failed_login_count_not_negative`

## Steps

1. Explain the schema change to the developer in two or three sentences and wait for approval.
2. Edit `prisma/schema.prisma` (snake_case database names with `@map` and `@@map`, as in the
   existing models).
3. Create the migration without applying it:
   `npx prisma migrate dev --name <short_name> --create-only`
4. Open the new `prisma/migrations/<timestamp>_<short_name>/migration.sql` and read all of it.
   Search it for `DROP`, `btree_gist`, `reservations_no_overlap` and every CHECK name above.
   - If it drops or changes a protected object, delete those lines and tell the developer.
   - If it drops a column or table that holds data, stop and ask.
5. Apply it: `npx prisma migrate dev`
6. Regenerate the client: `npx prisma generate`
7. If the seed needs the new field, update `prisma/seed.ts`, then run `npm run db:seed`.
8. Run `npm run test`. The integration test "database rules exist" must pass.
9. Commit the schema, the migration folder and the seed together:
   `feat(db): <what changed>`

## Never

- Never edit a migration that is already merged into develop. Make a new one.
- Never run `npx prisma migrate reset` or `npm run db:reset`, and never set
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION. If the database needs a reset, ask the developer to
  run `npm run db:reset` in their own terminal.
- Never install a Prisma version other than 7.10.0.
