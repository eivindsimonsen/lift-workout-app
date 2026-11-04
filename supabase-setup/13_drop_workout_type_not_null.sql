-- 13_drop_workout_type_not_null.sql
-- Purpose: workout type (Push/Pull/...) is no longer used by the app. Make the
-- column optional so new rows can omit it. Non-destructive: existing values stay.
-- Already run in production on 2026-11-04.

ALTER TABLE workout_templates ALTER COLUMN workout_type DROP NOT NULL;
ALTER TABLE workout_sessions  ALTER COLUMN workout_type DROP NOT NULL;
