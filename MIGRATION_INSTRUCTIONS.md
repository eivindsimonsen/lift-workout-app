# Database Migration Instructions

## Problem
The application is getting errors because it's trying to access the old `users` table, which has been renamed to `user_preferences`. The foreign key constraints in other tables still reference the old table name.

## Solution
You need to run the complete migration sequence in your Supabase database. Here are the steps:

### Step 1: Run the existing migration scripts in order

1. **01_users.sql** - Creates the initial users table
2. **02_user_preferences.sql** - Renames users to user_preferences and removes email/phone fields
3. **02_workout_templates.sql** - Creates workout templates table
4. **03_workout_sessions.sql** - Creates workout sessions table

### Step 2: Run the new foreign key fix script

**04_fix_foreign_keys.sql** - This is the critical script that fixes the foreign key references.

## How to run the migration

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run each script in order (01, 02_user_preferences, 02_workout_templates, 03_workout_sessions, 04_fix_foreign_keys)

## What the migration does

- **Renames** `users` table to `user_preferences`
- **Removes** email, phone, and name columns from the table
- **Updates** foreign key constraints in workout_templates and workout_sessions
- **Preserves** subscription information in user_preferences
- **Moves** profile data (name, email, phone) to Supabase Auth user_metadata

## After migration

- Profile updates will work correctly
- Workout sessions will load properly
- All data will be stored in the correct locations

## If you encounter errors

If you get errors about tables not existing, you may need to:
1. Check if the migration scripts were run in the correct order
2. Verify that the `user_preferences` table exists
3. Ensure all foreign key constraints are properly updated

## Verification

After running the migration, you should see:
- `user_preferences` table (not `users`)
- `workout_templates` table with proper foreign key to `user_preferences`
- `workout_sessions` table with proper foreign key to `user_preferences`
- No references to the old `users` table
