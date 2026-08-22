-- 12_exercise_tracking_type.sql
-- Purpose: let an exercise declare how it is measured.
--   'strength' → reps × weight  (everything that existed before)
--   'cardio'   → duration + optional distance
--
-- Safe to re-run. Existing rows become 'strength', which is what they already are.

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS tracking_type TEXT NOT NULL DEFAULT 'strength';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exercises_tracking_type_check'
  ) THEN
    ALTER TABLE exercises
      ADD CONSTRAINT exercises_tracking_type_check
      CHECK (tracking_type IN ('strength', 'cardio'));
  END IF;
END$$;

-- Variants inherit the type from their parent exercise, so no column is needed
-- on exercise_variants.
