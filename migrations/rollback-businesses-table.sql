-- ============================================
-- ROLLBACK: Remove Businesses Table
-- Date: 2025-11-15
-- Purpose: Remove accidentally created businesses table from wrong project
-- ============================================

-- Drop RLS Policies first
DROP POLICY IF EXISTS "Anyone can insert businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view their own business profile" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their own business profile" ON public.businesses;
DROP POLICY IF EXISTS "Public can view approved businesses" ON public.businesses;

-- Drop trigger
DROP TRIGGER IF EXISTS update_businesses_updated_at ON public.businesses;

-- Drop indexes (will be automatically dropped with table, but explicit for clarity)
DROP INDEX IF EXISTS public.idx_businesses_email;
DROP INDEX IF EXISTS public.idx_businesses_company_name;
DROP INDEX IF EXISTS public.idx_businesses_status;
DROP INDEX IF EXISTS public.idx_businesses_approved;
DROP INDEX IF EXISTS public.idx_businesses_user_id;
DROP INDEX IF EXISTS public.idx_businesses_industry;

-- Drop the businesses table
DROP TABLE IF EXISTS public.businesses CASCADE;

-- Drop the trigger function (only used by businesses table)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
