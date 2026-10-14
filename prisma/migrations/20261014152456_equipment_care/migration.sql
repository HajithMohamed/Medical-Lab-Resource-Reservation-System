-- CreateEnum
CREATE TYPE "equipment_record_kind" AS ENUM ('CALIBRATION', 'PREVENTIVE_MAINTENANCE', 'PERFORMANCE_CHECK', 'REPAIR', 'REPLACEMENT_REVIEW');

-- CreateEnum
CREATE TYPE "equipment_outcome" AS ENUM ('PASS', 'FAIL', 'NOT_DONE', 'KEEP_IN_SERVICE', 'REPLACE');

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "calibration_interval_days" INTEGER,
ADD COLUMN     "expected_service_life_years" INTEGER,
ADD COLUMN     "in_service_on" DATE,
ADD COLUMN     "maintenance_interval_days" INTEGER,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "next_calibration_due_on" DATE,
ADD COLUMN     "next_maintenance_due_on" DATE,
ADD COLUMN     "replacement_review_due_on" DATE,
ADD COLUMN     "serial_number" TEXT;

-- CreateTable
CREATE TABLE "equipment_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL,
    "kind" "equipment_record_kind" NOT NULL,
    "outcome" "equipment_outcome" NOT NULL,
    "performed_on" DATE NOT NULL,
    "performed_by" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "next_due_on" DATE,
    "recorded_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "equipment_records_resource_id_kind_performed_on_idx" ON "equipment_records"("resource_id", "kind", "performed_on");

-- AddForeignKey
ALTER TABLE "equipment_records" ADD CONSTRAINT "equipment_records_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_records" ADD CONSTRAINT "equipment_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written CHECK constraints: Equipment care & data integrity
-- Standards: ISO 15189:2022 6.4.5, 6.4.7, 6.5.2; WHO LQMS ch. 3

ALTER TABLE "resources"
  ADD CONSTRAINT "resources_calibration_interval_positive"
    CHECK (calibration_interval_days IS NULL OR calibration_interval_days > 0),
  ADD CONSTRAINT "resources_maintenance_interval_positive"
    CHECK (maintenance_interval_days IS NULL OR maintenance_interval_days > 0),
  ADD CONSTRAINT "resources_service_life_positive"
    CHECK (expected_service_life_years IS NULL OR expected_service_life_years > 0),
  ADD CONSTRAINT "resources_calibration_schedule_complete"
    CHECK ((calibration_interval_days IS NULL) = (next_calibration_due_on IS NULL)),
  ADD CONSTRAINT "resources_maintenance_schedule_complete"
    CHECK ((maintenance_interval_days IS NULL) = (next_maintenance_due_on IS NULL));

ALTER TABLE "equipment_records"
  ADD CONSTRAINT "equipment_records_outcome_fits_kind"
    CHECK ((kind = 'REPLACEMENT_REVIEW' AND outcome IN ('KEEP_IN_SERVICE','REPLACE'))
        OR (kind IN ('CALIBRATION','PREVENTIVE_MAINTENANCE') AND outcome IN ('PASS','FAIL','NOT_DONE'))
        OR (kind IN ('PERFORMANCE_CHECK','REPAIR') AND outcome IN ('PASS','FAIL'))),
  ADD CONSTRAINT "equipment_records_notes_when_failed"
    CHECK (outcome NOT IN ('FAIL','REPLACE','NOT_DONE') OR (notes IS NOT NULL AND length(trim(notes)) > 0)),
  ADD CONSTRAINT "equipment_records_next_due_after_performed"
    CHECK (next_due_on IS NULL OR next_due_on > performed_on),
  ADD CONSTRAINT "equipment_records_review_needs_date"
    CHECK (kind <> 'REPLACEMENT_REVIEW' OR next_due_on IS NOT NULL);
