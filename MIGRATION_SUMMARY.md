# Migration Summary: Users Table to User Preferences

## Overview
This migration changes the data storage strategy from storing email and phone number in a custom `users` table to relying solely on Supabase Auth (`auth.users` and `user_metadata`) for these fields. The `users` table has been renamed to `user_preferences` and now only stores subscription-related information.

## Changes Made

### 1. Database Schema Changes (`supabase-setup/02_user_preferences.sql`)
- **Table Renamed**: `users` → `user_preferences`
- **Columns Removed**: `email`, `phone`, `name`
- **Columns Kept**: `id`, `supabase_id`, `subscription_type`, `subscription_status`, `created_at`, `updated_at`, `last_login`
- **RLS Policies Updated**: New policies for `user_preferences` table
- **Purpose**: Now stores only user preferences (subscription info), not profile data

### 2. Profile.vue Updates
- **Data Source**: Email and phone now read directly from `workoutData.currentUser.value.email` and `workoutData.currentUser.value.user_metadata.phone`
- **Database Operations**: Only updates `user_preferences` table for subscription changes
- **Profile Updates**: Name, email, and phone updates go directly to Supabase Auth via `supabase.auth.updateUser()`
- **Table References**: Changed from `users` to `user_preferences`

### 3. useSupabaseData.ts Updates
- **Function Renamed**: `ensureUserProfile` → `ensureUserPreferences` (conceptually)
- **Table References**: Changed from `users` to `user_preferences`
- **syncUserEmail Function**: Completely removed (no longer needed)
- **Profile Creation**: Only creates records with subscription info, no email/phone/name

### 4. Login.vue Updates
- **Table References**: Changed from `users` to `user_preferences`
- **Profile Creation**: Only creates subscription records, no email/name fields
- **Error Messages**: Updated to reflect "user preferences" instead of "user profile"

### 5. useSupabase.ts Updates
- **Database Interface**: Updated `Database` interface to reflect new `user_preferences` table structure
- **Type Definitions**: Removed email/name fields, added subscription fields

## Benefits of This Change

### 1. **Data Consistency**
- Email and phone are now stored in only one place (Supabase Auth)
- No risk of data becoming out of sync between custom table and auth system
- Supabase Auth handles email verification automatically

### 2. **Simplified Architecture**
- Profile data (name, email, phone) managed entirely by Supabase Auth
- Custom table only handles business logic (subscriptions, preferences)
- Reduced complexity in data synchronization

### 3. **Better Security**
- Email changes require verification through Supabase's built-in flow
- Phone number updates go through Supabase Auth's secure channels
- No custom implementation of sensitive operations

### 4. **Maintenance**
- Less custom code to maintain
- Leverages Supabase's proven authentication patterns
- Clearer separation of concerns

## Data Flow After Migration

### Profile Data (Name, Email, Phone)
1. **Storage**: Supabase Auth (`auth.users` and `user_metadata`)
2. **Updates**: Via `supabase.auth.updateUser()`
3. **Display**: Directly from `currentUser.value.email` and `currentUser.value.user_metadata`

### User Preferences (Subscription Info)
1. **Storage**: `user_preferences` table
2. **Updates**: Via direct database operations
3. **Display**: From database with fallback to defaults

## Migration Steps for Production

1. **Run SQL Migration**: Execute `02_user_preferences.sql` in Supabase
2. **Deploy Code Changes**: All Vue components and composables updated
3. **Verify Data**: Ensure existing users can still access their subscription info
4. **Test Profile Updates**: Verify name/email/phone updates work through Supabase Auth

## Backward Compatibility

- **Existing Users**: Will continue to work, subscription data preserved
- **Profile Data**: Automatically migrated to Supabase Auth
- **No Data Loss**: All existing data is preserved in the new structure

## Notes

- Email changes still require verification through Supabase's email verification flow
- Phone number updates go through Supabase Auth's user metadata
- The `user_preferences` table is now purely for business logic, not profile data
- All RLS policies have been updated to reflect the new table name and purpose
