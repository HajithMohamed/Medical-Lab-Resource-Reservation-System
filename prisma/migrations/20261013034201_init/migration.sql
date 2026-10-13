-- The clash rule below needs btree_gist (uuid "=" inside a GiST index).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('STAFF', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "resource_status" AS ENUM ('ACTIVE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "reservation_kind" AS ENUM ('BOOKING', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "max_booking_minutes" INTEGER NOT NULL,
    "icon_key" TEXT NOT NULL DEFAULT 'other',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "category_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "status" "resource_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'STAFF',
    "site_id" UUID,
    "section_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "kind" "reservation_kind" NOT NULL DEFAULT 'BOOKING',
    "status" "reservation_status" NOT NULL DEFAULT 'CONFIRMED',
    "purpose" TEXT NOT NULL,
    "attendee_count" INTEGER,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "cancel_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sites_name_key" ON "sites"("name");

-- CreateIndex
-- CreateIndex
CREATE UNIQUE INDEX "sections_name_key" ON "sections"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "resources_category_id_idx" ON "resources"("category_id");

-- CreateIndex
CREATE INDEX "resources_section_id_idx" ON "resources"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "resources_site_id_name_key" ON "resources"("site_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_site_id_idx" ON "users"("site_id");

-- CreateIndex
CREATE INDEX "reservations_resource_id_start_at_idx" ON "reservations"("resource_id", "start_at");

-- CreateIndex
CREATE INDEX "reservations_created_by_id_start_at_idx" ON "reservations"("created_by_id", "start_at");

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================
-- Rules Prisma cannot express in schema.prisma. Added by hand.
-- Do not remove: tests/integration/database-rules.test.ts checks them.
-- =====================================================================

-- The clash rule: two CONFIRMED reservations (bookings or maintenance)
-- of the same resource may not overlap. '[)' means the end time is not
-- included, so 10:00-12:00 and 12:00-14:00 can both exist.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "resource_id" WITH =,
    tstzrange("start_at", "end_at", '[)') WITH &&
  )
  WHERE ("status" = 'CONFIRMED');

-- A reservation ends after it starts.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_time_order"
  CHECK ("end_at" > "start_at");

-- Confirmed rows have no cancel details; cancelled rows have all of them.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cancel_fields"
  CHECK (
    ("status" = 'CONFIRMED' AND "cancelled_at" IS NULL
      AND "cancelled_by_id" IS NULL AND "cancel_reason" IS NULL)
    OR
    ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL
      AND "cancelled_by_id" IS NOT NULL AND "cancel_reason" IS NOT NULL)
  );

-- Attendee numbers and capacities are positive when given.
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_attendee_count_positive"
  CHECK ("attendee_count" IS NULL OR "attendee_count" > 0);
ALTER TABLE "resources" ADD CONSTRAINT "resources_capacity_positive"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

-- Every category has a positive booking limit.
ALTER TABLE "categories" ADD CONSTRAINT "categories_max_booking_minutes_positive"
  CHECK ("max_booking_minutes" > 0);

-- Emails are stored in lowercase, so A@x.com and a@x.com are one account.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase"
  CHECK ("email" = lower("email"));

-- Staff and managers belong to a site; only admins may have none.
ALTER TABLE "users" ADD CONSTRAINT "users_site_required_unless_admin"
  CHECK ("role" = 'ADMIN' OR "site_id" IS NOT NULL);

-- The failed sign-in counter is never negative.
ALTER TABLE "users" ADD CONSTRAINT "users_failed_login_count_not_negative"
  CHECK ("failed_login_count" >= 0);
