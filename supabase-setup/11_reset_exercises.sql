-- 11_reset_exercises.sql
-- Purpose: Wipe all exercises and variants for a clean rebuild,
--          while preserving all workout session history and stats.
--
-- What is PRESERVED:
--   ✅ workout_sessions  — all your history, sets, reps, volume, dates
--   ✅ Stats.vue aggregates — total volume, sessions, 1RM, calendar, etc.
--      (Muscle Group Distribution will be empty until new exercises are created)
--
-- What is DELETED / RESET:
--   ❌ All rows in exercise_variants
--   ❌ All rows in exercises
--   ❌ exercises array inside workout_templates
--      (templates will have an empty exercise list — rebuild after adding new exercises)
--
-- ID sequence is intentionally NOT reset.
--   New exercises will receive IDs above the current max, so they can
--   never collide with the old IDs still referenced inside session JSONB.
--
-- Run in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Delete all variants (child table first to respect FK constraint) ──────
DELETE FROM exercise_variants;

-- ── 2. Delete all exercises ──────────────────────────────────────────────────
DELETE FROM exercises;

-- ── 3. Clear exercise lists from templates ───────────────────────────────────
-- Templates reference exercise IDs that no longer exist.
-- Resetting to an empty array lets you rebuild each template cleanly
-- once your new exercises are in place.
UPDATE workout_templates
SET exercises = '[]'::jsonb
WHERE exercises IS NOT NULL
  AND jsonb_array_length(exercises) > 0;

COMMIT;

-- ── Verification (run after the block above) ─────────────────────────────────
SELECT
  (SELECT COUNT(*)   FROM exercise_variants)     AS variants_remaining,
  (SELECT COUNT(*)   FROM exercises)             AS exercises_remaining,
  (SELECT COUNT(*)   FROM workout_sessions)      AS sessions_preserved,
  (SELECT COUNT(*)   FROM workout_templates)     AS templates_preserved,
  (SELECT last_value FROM exercises_id_seq)      AS next_exercise_id_starts_above;
