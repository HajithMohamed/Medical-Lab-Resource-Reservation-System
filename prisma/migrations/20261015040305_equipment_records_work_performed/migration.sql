-- AlterTable: Add work_performed and external_company to equipment_records
ALTER TABLE "equipment_records" ADD COLUMN "external_company" TEXT,
ADD COLUMN "work_performed" TEXT;

-- Hand-written CHECK constraints for equipment care records
-- Existing rows (seed, Supabase demo data) do not have work_performed,
-- so we add equipment_records_work_performed_when_done as NOT VALID to avoid
-- validating pre-existing rows while strictly checking all new inserts and updates.
ALTER TABLE "equipment_records"
  ADD CONSTRAINT "equipment_records_work_performed_when_done"
    CHECK (
      outcome NOT IN ('PASS','FAIL')
      OR kind NOT IN ('CALIBRATION','PREVENTIVE_MAINTENANCE','REPAIR','PERFORMANCE_CHECK')
      OR (work_performed IS NOT NULL AND length(trim(work_performed)) > 0)
    ) NOT VALID,
  ADD CONSTRAINT "equipment_records_work_performed_length"
    CHECK (work_performed IS NULL OR length(work_performed) <= 1000),
  ADD CONSTRAINT "equipment_records_external_company_length"
    CHECK (external_company IS NULL OR length(external_company) <= 120);
