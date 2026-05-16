-- 09_open_exercise_permissions.sql
-- Purpose: Allow any authenticated user to INSERT, UPDATE and DELETE any exercise
--          or variant, regardless of who originally created it.
--
-- Run this in the Supabase SQL editor.

-- -----------------------------------------------------------------------
-- exercises: replace owner-only UPDATE/DELETE with "any authed user" rules
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can delete own exercises" ON exercises;

-- Also allow inserting with user_id = NULL so global exercises can be seeded
-- (the seeding script sets user_id = NULL for all pre-loaded exercises).
DROP POLICY IF EXISTS "Users can insert own exercises" ON exercises;

CREATE POLICY "Authenticated users can insert exercises"
  ON exercises FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update any exercise"
  ON exercises FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete any exercise"
  ON exercises FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- -----------------------------------------------------------------------
-- exercise_variants: same treatment
-- -----------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can insert own variants"    ON exercise_variants;
DROP POLICY IF EXISTS "Users can update own variants"    ON exercise_variants;
DROP POLICY IF EXISTS "Users can delete own variants"    ON exercise_variants;

-- Allow inserting variants with user_id = NULL (global variants) or any user
CREATE POLICY "Authenticated users can insert variants"
  ON exercise_variants FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can update any variant"
  ON exercise_variants FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can delete any variant"
  ON exercise_variants FOR DELETE
  USING ((SELECT auth.uid()) IS NOT NULL);
