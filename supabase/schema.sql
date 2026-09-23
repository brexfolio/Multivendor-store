-- ==============================================================================
-- Habentech Multi-Vendor Telegram Marketplace — Unified Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up the complete multi-tenant platform.
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Common Trigger Function for updated_at
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. TENANTS (Shops / Stores)
-- ============================================================
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  shop_type text not null check (shop_type in (
    'electronics', 'clothing', 'furniture', 'home_materials',
    'vehicles', 'food', 'beauty', 'books', 'other'
  )),

  -- Media stored strictly as Telegram file_ids (NO Supabase buckets)
  logo_file_id text,
  banner_file_id text,

  -- Owner & Contact Information
  owner_telegram_id text not null,
  contact_phone text,
  contact_email text,
  support_telegram text,

  -- Telegram Channel / Group Publishing Configuration
  telegram_channel text,
  telegram_group text,
  telegram_group_title text,
  telegram_group_thread_id text,
  publish_target text default 'channel' check (publish_target in ('channel', 'group', 'both', 'none')),

  -- Optional BYOB (Bring Your Own Bot) for Phase 2
  custom_bot_token text,
  custom_bot_username text,

  -- Status & Settings
  status text default 'active' check (status in ('active', 'suspended', 'trial')),
  currency text default 'ETB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenants_slug on tenants (slug);
create index if not exists idx_tenants_owner on tenants (owner_telegram_id);
create index if not exists idx_tenants_shop_type on tenants (shop_type);
create index if not exists idx_tenants_status on tenants (status);

drop trigger if exists trg_tenants_updated_at on tenants;
create trigger trg_tenants_updated_at
  before update on tenants
  for each row execute function set_updated_at();

-- ============================================================
-- 2. TENANT MEMBERS (Staff & Role-Based Access Control)
-- ============================================================
create table if not exists tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  telegram_user_id text not null,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (tenant_id, telegram_user_id)
);

create index if not exists idx_tenant_members_user on tenant_members (telegram_user_id);
create index if not exists idx_tenant_members_tenant on tenant_members (tenant_id);

-- ============================================================
-- 3. PLATFORM SUPER ADMINS
-- ============================================================
create table if not exists platform_admins (
  telegram_user_id text primary key,
  name text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. PRODUCTS (Tenant-Scoped with Shop Type Metadata)
-- ============================================================
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  name text not null,
  category text not null,
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'ETB',
  condition text not null default 'Brand New',
  description text not null default '',
  availability text not null default 'Available' check (availability in (
    'Available', 'Low Stock', 'Sold', 'Unavailable', 'Out of Stock'
  )),
  featured boolean not null default false,

  -- Shop-type-specific dynamic attributes stored in JSONB
  metadata jsonb default '{}'::jsonb,

  -- Product photos stored strictly on Telegram CDN as file_id strings
  image_file_ids text[] default '{}'::text[],

  -- Publishing status
  channel_published boolean not null default false,
  telegram_channel_id text,
  telegram_channel_message_id text,
  telegram_channel_media_message_ids jsonb,
  channel_published_at timestamptz,
  group_published boolean not null default false,
  telegram_group_id text,
  telegram_group_message_id text,
  telegram_group_media_message_ids jsonb,
  telegram_group_thread_id text,
  group_published_at timestamptz,
  publish_target text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_tenant_id on products (tenant_id);
create index if not exists idx_products_category on products (category);
create index if not exists idx_products_availability on products (availability);
create index if not exists idx_products_featured on products (featured);
create index if not exists idx_products_created_at on products (created_at desc);
create index if not exists idx_products_tenant_category on products (tenant_id, category);
create index if not exists idx_products_tenant_availability on products (tenant_id, availability);
create index if not exists idx_products_metadata on products using gin (metadata);

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

-- Backward-compatibility product_images table if needed for existing data
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  telegram_file_id text,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_images_product_id on product_images (product_id);

-- Backward-compatibility product_specifications table
create table if not exists product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  label text not null,
  value text not null,
  display_order integer not null default 0
);
create index if not exists idx_product_specifications_product_id on product_specifications (product_id);

-- ============================================================
-- 5. ORDERS (Tenant-Scoped)
-- ============================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  telegram_user_id text not null,
  customer_name text not null,
  username text,
  customer_phone text,
  delivery_address text,
  quantity integer not null check (quantity > 0),
  total_price numeric(12, 2) not null,
  status text not null default 'Pending' check (status in (
    'Pending', 'Confirmed', 'Completed', 'Cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_tenant_id on orders (tenant_id);
create index if not exists idx_orders_product_id on orders (product_id);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_telegram_user_id on orders (telegram_user_id);
create index if not exists idx_orders_tenant_created on orders (tenant_id, created_at desc);

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- 6. PRODUCT REQUESTS (Inquiries / Backorders)
-- ============================================================
create table if not exists product_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  telegram_user_id text not null,
  customer_name text not null,
  username text,
  status text not null default 'Pending' check (status in (
    'Pending', 'Contacted', 'Completed', 'Sold', 'Unavailable'
  )),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_requests_tenant_id on product_requests (tenant_id);
create index if not exists idx_product_requests_product_id on product_requests (product_id);
create index if not exists idx_product_requests_status on product_requests (status);

-- ============================================================
-- 7. INVENTORY MANAGEMENT (Tenant-Scoped)
-- ============================================================
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  product_id uuid not null unique references products (id) on delete cascade,
  sku text,
  quantity integer not null default 0 check (quantity >= 0),
  minimum_stock_level integer not null default 0 check (minimum_stock_level >= 0),
  cost_price numeric(12, 2),
  selling_price numeric(12, 2),
  supplier text,
  storage_location text,
  purchase_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_tenant_product on inventory (tenant_id, product_id);

drop trigger if exists trg_inventory_updated_at on inventory;
create trigger trg_inventory_updated_at
  before update on inventory
  for each row execute function set_updated_at();

create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  inventory_id uuid not null references inventory (id) on delete cascade,
  product_id uuid not null references products (id) on delete cascade,
  transaction_type text not null check (transaction_type in (
    'Stock Added', 'Stock Removed', 'Sale', 'Adjustment', 'Return', 'Damage'
  )),
  quantity_change integer not null,
  previous_quantity integer not null,
  new_quantity integer not null,
  reason text,
  notes text,
  related_order_id uuid references orders (id) on delete set null,
  admin_telegram_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_transactions_tenant_id on inventory_transactions (tenant_id);
create index if not exists idx_inventory_transactions_inventory_id on inventory_transactions (inventory_id);
create index if not exists idx_inventory_transactions_product_id on inventory_transactions (product_id);
create index if not exists idx_inventory_transactions_created_at on inventory_transactions (created_at desc);
create index if not exists idx_inventory_transactions_related_order_id on inventory_transactions (related_order_id);

create unique index if not exists uq_inventory_sale_per_order
  on inventory_transactions (related_order_id) where transaction_type = 'Sale';

create unique index if not exists uq_inventory_return_per_order
  on inventory_transactions (related_order_id) where transaction_type = 'Return';

-- ============================================================
-- 8. SELL DEVICE / TRADE-IN (Tenant-Scoped)
-- ============================================================
create table if not exists sell_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  telegram_user_id text not null,
  customer_name text not null,
  telegram_username text,
  category text not null,
  brand text not null,
  model text not null,
  product_name text,
  condition text not null check (condition in ('Like New', 'Excellent', 'Good', 'Fair', 'Damaged')),
  condition_description text not null default '',
  expected_price numeric(12, 2) not null check (expected_price > 0),
  currency text not null default 'ETB',
  price_negotiable boolean not null default false,
  status text not null default 'Pending' check (status in (
    'Pending', 'Under Review', 'Offer Sent', 'Accepted', 'Rejected', 'Completed'
  )),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sell_requests_tenant_id on sell_requests (tenant_id);
create index if not exists idx_sell_requests_telegram_user_id on sell_requests (telegram_user_id);
create index if not exists idx_sell_requests_status on sell_requests (status);
create index if not exists idx_sell_requests_created_at on sell_requests (created_at desc);

drop trigger if exists trg_sell_requests_updated_at on sell_requests;
create trigger trg_sell_requests_updated_at
  before update on sell_requests
  for each row execute function set_updated_at();

create table if not exists sell_request_specifications (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests (id) on delete cascade,
  label text not null,
  value text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sell_request_images (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests (id) on delete cascade,
  image_url text not null,
  telegram_file_id text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists sell_offers (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests (id) on delete cascade,
  offer_price numeric(12, 2) not null check (offer_price > 0),
  currency text not null default 'ETB',
  message text,
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Rejected', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_sell_offers_updated_at on sell_offers;
create trigger trg_sell_offers_updated_at
  before update on sell_offers
  for each row execute function set_updated_at();

-- ============================================================
-- 9. PLATFORM SETTINGS (Fallback / Global Info)
-- ============================================================
create table if not exists store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'Habentech Marketplace',
  store_description text not null default 'The multi-vendor Telegram Mini App marketplace.',
  telegram_channel text,
  telegram_group text,
  telegram_group_title text,
  telegram_group_thread_id text,
  publish_target text not null default 'channel',
  contact_phone text,
  contact_email text,
  updated_at timestamptz not null default now()
);

insert into store_settings (store_name, store_description)
select 'Habentech Marketplace', 'The multi-vendor Telegram Mini App marketplace.'
where not exists (select 1 from store_settings);

-- ============================================================
-- 10. SEED DEFAULT TENANT ('habentech', shop_type='electronics')
-- ============================================================
do $$
declare
  default_tenant_id uuid;
begin
  if not exists (select 1 from tenants where slug = 'habentech') then
    insert into tenants (
      slug, name, description, shop_type, owner_telegram_id, currency
    ) values (
      'habentech', 'Haben Tech', 'Premium electronics, smartphones, and accessories.', 'electronics', '6413421724', 'ETB'
    ) returning id into default_tenant_id;

    insert into tenant_members (tenant_id, telegram_user_id, role)
    values (default_tenant_id, '6413421724', 'owner')
    on conflict do nothing;
  end if;
end $$;

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS) & PRIVILEGES
-- ============================================================
alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table platform_admins enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_specifications enable row level security;
alter table orders enable row level security;
alter table product_requests enable row level security;
alter table inventory enable row level security;
alter table inventory_transactions enable row level security;
alter table sell_requests enable row level security;
alter table sell_request_specifications enable row level security;
alter table sell_request_images enable row level security;
alter table sell_offers enable row level security;
alter table store_settings enable row level security;

-- Public read policies for customers
drop policy if exists "public read active tenants" on tenants;
create policy "public read active tenants"
  on tenants for select to anon
  using (status = 'active');

drop policy if exists "public read available products" on products;
create policy "public read available products"
  on products for select to anon
  using (availability <> 'Unavailable');

drop policy if exists "public read product images" on product_images;
create policy "public read product images"
  on product_images for select to anon
  using (true);

drop policy if exists "public read product specifications" on product_specifications;
create policy "public read product specifications"
  on product_specifications for select
  to anon
  using (true);

drop policy if exists "public read store settings" on store_settings;
create policy "public read store settings"
  on store_settings for select to anon
  using (true);

-- Base Grants
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select on tables to anon;
