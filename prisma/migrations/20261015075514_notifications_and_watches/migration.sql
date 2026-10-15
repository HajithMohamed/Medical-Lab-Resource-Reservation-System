-- CreateEnum
CREATE TYPE "notification_kind" AS ENUM ('BOOKING_CANCELLED', 'EQUIPMENT_OUT_OF_SERVICE', 'DUE_SOON', 'DUE_TODAY', 'OVERDUE', 'REVIEW_DUE', 'RESOURCE_BACK_IN_SERVICE', 'SLOT_FREE');

-- CreateEnum
CREATE TYPE "resource_watch_kind" AS ENUM ('BACK_IN_SERVICE', 'SLOT_FREE');

-- CreateEnum
CREATE TYPE "resource_watch_status" AS ENUM ('ACTIVE', 'SENT', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" "notification_kind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "resource_id" UUID,
    "dedupe_key" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "kind" "notification_kind" NOT NULL,
    "in_app" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id","kind")
);

-- CreateTable
CREATE TABLE "resource_watches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "kind" "resource_watch_kind" NOT NULL,
    "status" "resource_watch_status" NOT NULL DEFAULT 'ACTIVE',
    "wanted_start" TIMESTAMPTZ(6),
    "wanted_end" TIMESTAMPTZ(6),
    "duration_minutes" INTEGER,
    "flexible_day" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_watches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "resource_watches_resource_id_idx" ON "resource_watches"("resource_id");

-- CreateIndex
CREATE INDEX "resource_watches_user_id_status_idx" ON "resource_watches"("user_id", "status");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_watches" ADD CONSTRAINT "resource_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_watches" ADD CONSTRAINT "resource_watches_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written constraints and partial indexes for notifications and resource watches

-- 1. notifications: link must start with '/'
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_link_starts_with_slash"
    CHECK ("link" LIKE '/%');

-- 2. notifications: partial index for unread notifications per user
CREATE INDEX "notifications_user_id_unread_idx"
  ON "notifications"("user_id")
  WHERE "read_at" IS NULL;

-- 3. resource_watches: kind field checks
ALTER TABLE "resource_watches"
  ADD CONSTRAINT "resource_watches_kind_fields"
    CHECK (
      ("kind" = 'SLOT_FREE' AND "wanted_start" IS NOT NULL AND "wanted_end" IS NOT NULL AND "wanted_start" < "wanted_end" AND "duration_minutes" IS NOT NULL AND "duration_minutes" > 0)
      OR
      ("kind" = 'BACK_IN_SERVICE' AND "wanted_start" IS NULL AND "wanted_end" IS NULL AND "duration_minutes" IS NULL)
    );

-- 4. resource_watches: partial unique active watch per user/resource/kind/start
CREATE UNIQUE INDEX "resource_watches_user_resource_kind_active_idx"
  ON "resource_watches"("user_id", "resource_id", "kind", "wanted_start")
  NULLS NOT DISTINCT
  WHERE "status" = 'ACTIVE';

-- 5. resource_watches: partial index for active watches on a resource
CREATE INDEX "resource_watches_resource_active_idx"
  ON "resource_watches"("resource_id")
  WHERE "status" = 'ACTIVE';

