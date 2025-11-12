-- ============================================================================
-- Backfill User Roles into JWT (app_metadata)
-- ============================================================================
-- This script updates all existing creators and admins to have their role
-- stored in Supabase auth app_metadata, ensuring it's embedded in the JWT.
--
-- Run this in the Supabase SQL Editor or via psql
-- ============================================================================

-- STEP 1: Check current state BEFORE backfill
-- ============================================================================
SELECT
  COUNT(*)                                         AS total_users,
  COUNT(*) FILTER (WHERE u.role = 'creator')      AS db_creators,
  COUNT(*) FILTER (WHERE u.role = 'admin')        AS db_admins,
  COUNT(*) FILTER (WHERE u.role = 'fan')          AS db_fans,
  COUNT(*) FILTER (WHERE au.raw_app_meta_data->>'role' = 'creator') AS jwt_creators_before,
  COUNT(*) FILTER (WHERE au.raw_app_meta_data->>'role' = 'admin')   AS jwt_admins_before
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id;

-- Expected: jwt_creators_before and jwt_admins_before should be low/zero
-- ============================================================================


-- STEP 2: Backfill CREATORS → JWT role
-- ============================================================================
UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  COALESCE(au.raw_app_meta_data, '{}'::jsonb),
  '{role}', to_jsonb('creator'::text), true
)
WHERE EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.id = au.id AND u.role = 'creator'
);

-- ============================================================================


-- STEP 3: Backfill ADMINS → JWT role
-- ============================================================================
UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  COALESCE(au.raw_app_meta_data, '{}'::jsonb),
  '{role}', to_jsonb('admin'::text), true
)
WHERE EXISTS (
  SELECT 1 FROM public.users u
  WHERE u.id = au.id AND u.role = 'admin'
);

-- ============================================================================


-- STEP 4: Verify AFTER backfill
-- ============================================================================
SELECT
  COUNT(*)                                         AS total_users,
  COUNT(*) FILTER (WHERE u.role = 'creator')      AS db_creators,
  COUNT(*) FILTER (WHERE u.role = 'admin')        AS db_admins,
  COUNT(*) FILTER (WHERE u.role = 'fan')          AS db_fans,
  COUNT(*) FILTER (WHERE au.raw_app_meta_data->>'role' = 'creator') AS jwt_creators_after,
  COUNT(*) FILTER (WHERE au.raw_app_meta_data->>'role' = 'admin')   AS jwt_admins_after
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id;

-- Expected: jwt_creators_after = db_creators, jwt_admins_after = db_admins
-- ============================================================================


-- STEP 5: Detailed view of mismatches (if any)
-- ============================================================================
SELECT
  u.id,
  u.email,
  u.username,
  u.role AS db_role,
  au.raw_app_meta_data->>'role' AS jwt_role,
  CASE
    WHEN u.role IS NULL THEN 'User exists in auth but not in public.users'
    WHEN au.raw_app_meta_data->>'role' IS NULL THEN 'Missing JWT role'
    WHEN u.role != au.raw_app_meta_data->>'role' THEN 'Role mismatch'
    ELSE 'OK'
  END AS status
FROM public.users u
FULL OUTER JOIN auth.users au ON au.id = u.id
WHERE
  -- Only show problems
  u.role IS NULL
  OR au.raw_app_meta_data->>'role' IS NULL
  OR u.role != au.raw_app_meta_data->>'role';

-- Expected: Empty result set means everything is in sync
-- ============================================================================


-- OPTIONAL: Check a specific user (replace with actual email)
-- ============================================================================
-- SELECT
--   u.id,
--   u.email,
--   u.username,
--   u.role AS db_role,
--   au.raw_app_meta_data->>'role' AS jwt_role,
--   au.raw_app_meta_data,
--   au.raw_user_meta_data
-- FROM public.users u
-- JOIN auth.users au ON au.id = u.id
-- WHERE u.email = 'miriam@example.com';
-- ============================================================================
