-- ==============================================================================
-- Habentech Multi-Tenant SaaS Schema Migration
-- Transforms single-tenant Habentech into a multi-shop marketplace platform.
-- ==============================================================================

-- 1. Create Tenants Table (Stores/Shops)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    owner_telegram_id TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    support_telegram TEXT,
    telegram_channel TEXT,
    telegram_group TEXT,
    telegram_group_title TEXT,
    telegram_group_thread_id TEXT,
    publish_target TEXT DEFAULT 'channel' CHECK (publish_target IN ('channel', 'group', 'both', 'none')),
    custom_bot_token TEXT,
    custom_bot_username TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
    currency TEXT DEFAULT 'ETB',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for instant slug and owner lookups
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_telegram_id);

-- 2. Create Tenant Members Table (Roles: owner, manager, staff)
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    telegram_user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, telegram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);

-- 3. Create Platform Super Admins Table
CREATE TABLE IF NOT EXISTS platform_admins (
    telegram_user_id TEXT PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Seed Primary Default Tenant (Habentech) if not present
DO $$
DECLARE
    default_tenant_id UUID;
    existing_owner TEXT := COALESCE(
        current_setting('app.settings.admin_id', true),
        '100000000' -- placeholder if not set; will be updated with actual admin ID
    );
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE slug = 'habentech') THEN
        INSERT INTO tenants (slug, name, description, owner_telegram_id, currency)
        VALUES ('habentech', 'Haben Tech', 'Premium electronics, smartphones, and accessories.', existing_owner, 'ETB')
        RETURNING id INTO default_tenant_id;

        INSERT INTO tenant_members (tenant_id, telegram_user_id, role)
        VALUES (default_tenant_id, existing_owner, 'owner')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 5. Add tenant_id to existing entity tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE sell_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE product_requests ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 6. Backfill existing records to the default 'habentech' tenant
DO $$
DECLARE
    default_id UUID;
BEGIN
    SELECT id INTO default_id FROM tenants WHERE slug = 'habentech' LIMIT 1;
    IF default_id IS NOT NULL THEN
        UPDATE products SET tenant_id = default_id WHERE tenant_id IS NULL;
        UPDATE orders SET tenant_id = default_id WHERE tenant_id IS NULL;
        UPDATE inventory SET tenant_id = default_id WHERE tenant_id IS NULL;
        UPDATE inventory_transactions SET tenant_id = default_id WHERE tenant_id IS NULL;
        UPDATE sell_requests SET tenant_id = default_id WHERE tenant_id IS NULL;
        UPDATE product_requests SET tenant_id = default_id WHERE tenant_id IS NULL;
    END IF;
END $$;

-- 7. Add High-Performance Compound Indexes for Multi-Tenant Queries
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_products_tenant_availability ON products(tenant_id, availability);
CREATE INDEX IF NOT EXISTS idx_products_tenant_created ON products(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_product ON inventory(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_tenant_product ON inventory_transactions(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_tenant ON sell_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_product_requests_tenant ON product_requests(tenant_id, status);

-- 8. Updated-at trigger for tenants
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION update_tenants_updated_at();

-- 9. Row-Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Allow public read on active tenants
DROP POLICY IF EXISTS "Public can view active tenants" ON tenants;
CREATE POLICY "Public can view active tenants"
ON tenants FOR SELECT
USING (status = 'active');

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access on tenants" ON tenants;
CREATE POLICY "Service role full access on tenants"
ON tenants FOR ALL
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on tenant_members" ON tenant_members;
CREATE POLICY "Service role full access on tenant_members"
ON tenant_members FOR ALL
USING (true) WITH CHECK (true);
