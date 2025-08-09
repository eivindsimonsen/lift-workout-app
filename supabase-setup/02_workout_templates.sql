-- 02_workout_templates.sql
-- Purpose: Create workout_templates table and policies

-- Optional: clean up (use with care)
-- DROP TABLE IF EXISTS workout_templates CASCADE;

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workout_type TEXT NOT NULL,
  exercises JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_templates_user_id ON workout_templates(user_id);

-- RLS
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'workout_templates' AND policyname = 'Users can view own templates'
  ) THEN
    CREATE POLICY "Users can view own templates" ON workout_templates FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'workout_templates' AND policyname = 'Users can insert own templates'
  ) THEN
    CREATE POLICY "Users can insert own templates" ON workout_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'workout_templates' AND policyname = 'Users can update own templates'
  ) THEN
    CREATE POLICY "Users can update own templates" ON workout_templates FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = current_schema() AND tablename = 'workout_templates' AND policyname = 'Users can delete own templates'
  ) THEN
    CREATE POLICY "Users can delete own templates" ON workout_templates FOR DELETE USING (auth.uid() = user_id);
  END IF;
END$$;


