-- ==============================================================================
-- Migration: Tenant Shop Approval Workflow
-- Run this in Supabase SQL Editor to support the shop approval system.
-- ==============================================================================

-- 1. Update the status check constraint to include 'pending_approval' and 'rejected'
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;

ALTER TABLE tenants 
  ADD CONSTRAINT tenants_status_check 
  CHECK (status IN ('pending_approval', 'active', 'suspended', 'trial', 'rejected'));

-- 2. Make 'pending_approval' the default status for newly created stores
ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'pending_approval';

-- 3. Add audit and review columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reviewed_by text;

-- 4. Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status);
