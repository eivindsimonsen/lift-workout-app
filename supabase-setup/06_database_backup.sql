-- =====================================================
-- LIFT Workout App - Complete Database Backup Script
-- =====================================================
-- This script creates a complete backup of all user data
-- Run this in Supabase SQL Editor to export all data
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BACKUP WORKOUT TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_workout_templates AS
SELECT 
    id,
    user_id,
    name,
    workout_type,
    exercises,
    created_at,
    updated_at
FROM workout_templates
WHERE user_id IS NOT NULL;

-- Add backup metadata
ALTER TABLE backup_workout_templates 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- 2. BACKUP WORKOUT SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_workout_sessions AS
SELECT 
    id,
    user_id,
    template_id,
    template_name,
    workout_type,
    date,
    duration,
    total_volume,
    exercises,
    is_completed,
    created_at,
    updated_at
FROM workout_sessions
WHERE user_id IS NOT NULL;

-- Add backup metadata
ALTER TABLE backup_workout_sessions 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- 3. BACKUP USER PROFILES (from auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_user_profiles AS
SELECT 
    id as user_id,
    email,
    created_at as user_created_at,
    updated_at as user_updated_at,
    last_sign_in_at,
    raw_user_meta_data->>'full_name' as full_name,
    raw_user_meta_data->>'phone' as phone,
    raw_user_meta_data->>'avatar_url' as avatar_url,
    raw_user_meta_data->>'preferences' as preferences
FROM auth.users
WHERE id IS NOT NULL;

-- Add backup metadata
ALTER TABLE backup_user_profiles 
ADD COLUMN IF NOT EXISTS backup_created_at TIMESTAMP DEFAULT NOW();

-- =====================================================
-- 4. CREATE BACKUP SUMMARY
-- =====================================================
CREATE TABLE IF NOT EXISTS backup_summary AS
SELECT 
    'workout_templates' as table_name,
    COUNT(*) as record_count,
    MIN(backup_created_at) as earliest_backup,
    MAX(backup_created_at) as latest_backup
FROM backup_workout_templates
UNION ALL
SELECT 
    'workout_sessions' as table_name,
    COUNT(*) as record_count,
    MIN(backup_created_at) as earliest_backup,
    MAX(backup_created_at) as latest_backup
FROM backup_workout_sessions
UNION ALL
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count,
    MIN(backup_created_at) as earliest_backup,
    MAX(backup_created_at) as latest_backup
FROM backup_user_profiles;

-- =====================================================
-- 5. EXPORT QUERIES (Run these to get your data)
-- =====================================================

-- Export all workout templates
-- SELECT * FROM backup_workout_templates ORDER BY user_id, created_at;

-- Export all workout sessions
-- SELECT * FROM backup_workout_sessions ORDER BY user_id, date;

-- Export all user profiles
-- SELECT * FROM backup_user_profiles ORDER BY user_created_at;

-- Export specific user's data (replace 'USER_ID_HERE' with actual user ID)
-- SELECT 'TEMPLATES' as data_type, * FROM backup_workout_templates WHERE user_id = 'USER_ID_HERE'
-- UNION ALL
-- SELECT 'SESSIONS' as data_type, * FROM backup_workout_sessions WHERE user_id = 'USER_ID_HERE'
-- UNION ALL
-- SELECT 'PROFILE' as data_type, * FROM backup_user_profiles WHERE user_id = 'USER_ID_HERE'
-- ORDER BY data_type, created_at;

-- =====================================================
-- 6. CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean old backups (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS void AS $$
BEGIN
    DELETE FROM backup_workout_templates 
    WHERE backup_created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM backup_workout_sessions 
    WHERE backup_created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM backup_user_profiles 
    WHERE backup_created_at < NOW() - INTERVAL '30 days';
    
    DELETE FROM backup_summary 
    WHERE latest_backup < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to get backup statistics
CREATE OR REPLACE FUNCTION get_backup_stats()
RETURNS TABLE(
    table_name text,
    total_records bigint,
    unique_users bigint,
    data_size_mb numeric,
    last_backup timestamp
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'workout_templates'::text as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(pg_total_relation_size('backup_workout_templates') / 1024.0 / 1024.0, 2) as data_size_mb,
        MAX(backup_created_at) as last_backup
    FROM backup_workout_templates
    UNION ALL
    SELECT 
        'workout_sessions'::text as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(pg_total_relation_size('backup_workout_sessions') / 1024.0 / 1024.0, 2) as data_size_mb,
        MAX(backup_created_at) as last_backup
    FROM backup_workout_sessions
    UNION ALL
    SELECT 
        'user_profiles'::text as table_name,
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        ROUND(pg_total_relation_size('backup_user_profiles') / 1024.0 / 1024.0, 2) as data_size_mb,
        MAX(backup_created_at) as last_backup
    FROM backup_user_profiles;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. USAGE INSTRUCTIONS
-- =====================================================

-- To run this backup:
-- 1. Execute this entire script in Supabase SQL Editor
-- 2. Run: SELECT * FROM backup_summary; to see what was backed up
-- 3. Run: SELECT * FROM get_backup_stats(); to see detailed statistics
-- 4. Export specific data using the queries in section 5

-- To restore data (if needed):
-- 1. Use the backup tables to restore data
-- 2. Be careful with user_id references
-- 3. Test in a development environment first

-- To clean up old backups:
-- SELECT cleanup_old_backups();

-- =====================================================
-- 8. BACKUP VERIFICATION
-- =====================================================

-- Verify backup integrity
SELECT 
    'Templates' as table_type,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM backup_workout_templates) as backup_count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM backup_workout_templates) 
        THEN '✅ MATCH' 
        ELSE '❌ MISMATCH' 
    END as status
FROM workout_templates
WHERE user_id IS NOT NULL

UNION ALL

SELECT 
    'Sessions' as table_type,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM backup_workout_sessions) as backup_count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM backup_workout_sessions) 
        THEN '✅ MATCH' 
        ELSE '❌ MISMATCH' 
    END as status
FROM workout_sessions
WHERE user_id IS NOT NULL

UNION ALL

SELECT 
    'Users' as table_type,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM backup_user_profiles) as backup_count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM backup_user_profiles) 
        THEN '✅ MATCH' 
        ELSE '❌ MISMATCH' 
    END as status
FROM auth.users;
