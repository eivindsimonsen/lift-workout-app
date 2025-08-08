-- Fix exercises table - remove category column and ensure correct structure
-- This script will fix the NOT NULL constraint violation

-- First, drop the existing exercises table completely
DROP TABLE IF EXISTS exercises CASCADE;

-- Recreate the exercises table with the correct structure
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  muscle_groups TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique exercise names per user
  UNIQUE(user_id, name)
);

-- Create index for faster queries
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_muscle_groups ON exercises USING GIN(muscle_groups);

-- Enable Row Level Security
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own exercises" ON exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercises" ON exercises
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_exercises_updated_at 
  BEFORE UPDATE ON exercises 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Note: This will delete all existing exercises and recreate the table
-- Users will need to add their exercises again through the UI
