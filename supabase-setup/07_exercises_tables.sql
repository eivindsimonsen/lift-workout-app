-- 07_exercises_tables.sql
-- Purpose: Create exercises and exercise_variants tables with RLS
-- exercises.user_id = NULL means a global/default exercise visible to all users
-- exercises.user_id = <uuid> means a user-created exercise visible only to that user

-- Optional: clean up (use with care)
-- DROP TABLE IF EXISTS exercise_variants CASCADE;
-- DROP TABLE IF EXISTS exercises CASCADE;

CREATE TABLE IF NOT EXISTS exercises (
  id            SERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  category      TEXT NOT NULL,
  workout_types TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exercise_variants (
  id          SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  equipment   TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_user_id         ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_category        ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercise_variants_exercise_id ON exercise_variants(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_variants_user_id ON exercise_variants(user_id);

-- RLS
ALTER TABLE exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- exercises: SELECT (own + global)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercises' AND policyname = 'Users can view own and global exercises'
  ) THEN
    CREATE POLICY "Users can view own and global exercises"
      ON exercises FOR SELECT
      USING (user_id IS NULL OR (SELECT auth.uid()) = user_id);
  END IF;

  -- exercises: INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercises' AND policyname = 'Users can insert own exercises'
  ) THEN
    CREATE POLICY "Users can insert own exercises"
      ON exercises FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  -- exercises: UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercises' AND policyname = 'Users can update own exercises'
  ) THEN
    CREATE POLICY "Users can update own exercises"
      ON exercises FOR UPDATE
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  -- exercises: DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercises' AND policyname = 'Users can delete own exercises'
  ) THEN
    CREATE POLICY "Users can delete own exercises"
      ON exercises FOR DELETE
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  -- exercise_variants: SELECT (own + global)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercise_variants' AND policyname = 'Users can view own and global variants'
  ) THEN
    CREATE POLICY "Users can view own and global variants"
      ON exercise_variants FOR SELECT
      USING (user_id IS NULL OR (SELECT auth.uid()) = user_id);
  END IF;

  -- exercise_variants: INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercise_variants' AND policyname = 'Users can insert own variants'
  ) THEN
    CREATE POLICY "Users can insert own variants"
      ON exercise_variants FOR INSERT
      WITH CHECK ((SELECT auth.uid()) = user_id);
  END IF;

  -- exercise_variants: UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercise_variants' AND policyname = 'Users can update own variants'
  ) THEN
    CREATE POLICY "Users can update own variants"
      ON exercise_variants FOR UPDATE
      USING ((SELECT auth.uid()) = user_id);
  END IF;

  -- exercise_variants: DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'exercise_variants' AND policyname = 'Users can delete own variants'
  ) THEN
    CREATE POLICY "Users can delete own variants"
      ON exercise_variants FOR DELETE
      USING ((SELECT auth.uid()) = user_id);
  END IF;
END$$;
