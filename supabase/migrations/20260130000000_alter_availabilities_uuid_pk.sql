-- Migration: Update availabilities table to UUID PK with partial unique index
-- Date: 2026-01-30
-- Description: Changes availabilities from unit_id PK to UUID PK with partial unique constraint

-- Step 1: Drop existing constraints and indexes
DROP INDEX IF EXISTS idx_availabilities_property;
DROP INDEX IF EXISTS idx_availabilities_status;

-- Step 2: Add new id column as UUID
ALTER TABLE public.availabilities ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Step 3: Drop old primary key constraint
ALTER TABLE public.availabilities DROP CONSTRAINT IF EXISTS availabilities_pkey;

-- Step 4: Set id as new primary key
ALTER TABLE public.availabilities ADD PRIMARY KEY (id);

-- Step 5: Ensure unit_id is NOT NULL (it was PK before, so should be fine)
ALTER TABLE public.availabilities ALTER COLUMN unit_id SET NOT NULL;

-- Step 6: Create partial unique index for active availabilities
CREATE UNIQUE INDEX IF NOT EXISTS idx_availabilities_active_unit 
ON public.availabilities(unit_id) WHERE (is_active = true);

-- Step 7: Recreate other indexes
CREATE INDEX IF NOT EXISTS idx_availabilities_property ON public.availabilities(property_code);
CREATE INDEX IF NOT EXISTS idx_availabilities_status ON public.availabilities(status);
CREATE INDEX IF NOT EXISTS idx_availabilities_unit ON public.availabilities(unit_id);
CREATE INDEX IF NOT EXISTS idx_availabilities_future ON public.availabilities(future_tenancy_id);
