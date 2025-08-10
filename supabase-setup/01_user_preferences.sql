-- 02_user_preferences.sql
-- Purpose: Rename users table to user_preferences and remove email/phone fields
-- This table now only stores user preferences like subscription info, not profile data

-- Rename the existing users table to user_preferences
ALTER TABLE IF EXISTS users RENAME TO user_preferences;

-- Remove email and phone columns (these are now stored in Supabase Auth)
ALTER TABLE user_preferences DROP COLUMN IF EXISTS email;
ALTER TABLE user_preferences DROP COLUMN IF EXISTS phone;

-- Update the table structure to reflect its new purpose
-- Keep only: id, supabase_id, subscription_type, subscription_status, created_at, updated_at, last_login
-- Remove: name (this is now in user_metadata)

-- Remove name column as well (this is now stored in Supabase Auth user_metadata)
ALTER TABLE user_preferences DROP COLUMN IF EXISTS name;

-- Update RLS policies to use the new table name
DROP POLICY IF EXISTS "Users can view own profile" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own profile" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_preferences;

-- Create new policies for user_preferences table
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = id);

-- Add a comment to document the table's new purpose
COMMENT ON TABLE user_preferences IS 'Stores user preferences like subscription information. Profile data (name, email, phone) is stored in Supabase Auth user_metadata.';
