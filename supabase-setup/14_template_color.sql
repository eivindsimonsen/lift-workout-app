-- 14_template_color.sql
-- Purpose: each template gets an optional colour the user picks (one of the
-- muscle-group colours in src/data/muscle-groups.json). NULL means no colour
-- (shown grey). Non-destructive: existing templates keep everything else.
-- Run this BEFORE deploying the app version that writes the column, or saving
-- templates fails.

ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS color TEXT;
