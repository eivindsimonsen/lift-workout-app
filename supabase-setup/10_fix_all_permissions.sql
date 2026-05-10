-- 10_fix_all_permissions.sql
-- Purpose: Replace all restrictive RLS policies with open "any authenticated user"
--          policies so that every logged-in user can view, insert, update, and delete
--          any exercise or variant.
--
-- Root cause of "exercise reappears after refresh":
--   The old DELETE policy was  USING (auth.uid() = user_id).
--   For seeded exercises user_id IS NULL, so the check evaluates to NULL (not TRUE),
--   and Supabase silently skips the delete without returning an error.
--   The frontend removed the row from local state (so it appeared deleted), but the
--   database row was never touched.
--
-- Run this in the Supabase SQL editor.

-- ── exercises ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own and global exercises"      ON exercises;
DROP POLICY IF EXISTS "Users can insert own exercises"               ON exercises;
DROP POLICY IF EXISTS "Users can update own exercises"               ON exercises;
DROP POLICY IF EXISTS "Users can delete own exercises"               ON exercises;
DROP POLICY IF EXISTS "Authenticated users can insert exercises"     ON exercises;
DROP POLICY IF EXISTS "Authenticated users can update any exercise"  ON exercises;
DROP POLICY IF EXISTS "Authenticated users can delete any exercise"  ON exercises;

CREATE POLICY "Authenticated users can view all exercises"
  ON exercises FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert exercises"
  ON exercises FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update any exercise"
  ON exercises FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete any exercise"
  ON exercises FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- ── exercise_variants ───────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can view own and global variants"       ON exercise_variants;
DROP POLICY IF EXISTS "Users can insert own variants"                ON exercise_variants;
DROP POLICY IF EXISTS "Users can update own variants"                ON exercise_variants;
DROP POLICY IF EXISTS "Users can delete own variants"                ON exercise_variants;
DROP POLICY IF EXISTS "Authenticated users can insert variants"      ON exercise_variants;
DROP POLICY IF EXISTS "Authenticated users can update any variant"   ON exercise_variants;
DROP POLICY IF EXISTS "Authenticated users can delete any variant"   ON exercise_variants;

CREATE POLICY "Authenticated users can view all variants"
  ON exercise_variants FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can insert variants"
  ON exercise_variants FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update any variant"
  ON exercise_variants FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete any variant"
  ON exercise_variants FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);
