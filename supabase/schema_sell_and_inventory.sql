-- ============================================================
-- Habentech Electronics — Sell Device + Inventory Management
-- Run this AFTER supabase/schema.sql in the Supabase SQL editor.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Extend products.availability to include the automatic
-- inventory-driven "Out of Stock" state, alongside the existing
-- admin-managed Available / Low Stock / Sold / Unavailable values.
-- ------------------------------------------------------------
alter table products drop constraint if exists products_availability_check;
alter table products add constraint products_availability_check
  check (availability in ('Available', 'Low Stock', 'Sold', 'Unavailable', 'Out of Stock'));

-- ============================================================
-- SELL DEVICE
-- ============================================================

create table if not exists sell_requests (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null,
  customer_name text not null,
  telegram_username text,
  category text not null check (category in (
    'Smartphone', 'Laptop', 'Tablet', 'Smart Watch', 'Gaming Device', 'Accessory', 'Other'
  )),
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

create index if not exists idx_sell_requests_telegram_user_id on sell_requests (telegram_user_id);
create index if not exists idx_sell_requests_status on sell_requests (status);
create index if not exists idx_sell_requests_created_at on sell_requests (created_at desc);

create table if not exists sell_request_specifications (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests (id) on delete cascade,
  label text not null,
  value text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_sell_request_specs_request_id on sell_request_specifications (sell_request_id);

create table if not exists sell_request_images (
  id uuid primary key default gen_random_uuid(),
  sell_request_id uuid not null references sell_requests (id) on delete cascade,
  image_url text not null,
  telegram_file_id text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_sell_request_images_request_id on sell_request_images (sell_request_id);

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

create index if not exists idx_sell_offers_request_id on sell_offers (sell_request_id);

drop trigger if exists trg_sell_requests_updated_at on sell_requests;
create trigger trg_sell_requests_updated_at
  before update on sell_requests
  for each row execute function set_updated_at();

drop trigger if exists trg_sell_offers_updated_at on sell_offers;
create trigger trg_sell_offers_updated_at
  before update on sell_offers
  for each row execute function set_updated_at();

alter table sell_requests enable row level security;
alter table sell_request_specifications enable row level security;
alter table sell_request_images enable row level security;
alter table sell_offers enable row level security;
-- No anon policies: all sell-request reads/writes go through server
-- routes (service role key) which enforce ownership/admin checks.

-- ============================================================
-- INVENTORY MANAGEMENT
-- ============================================================

create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
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

-- `unique` on product_id guarantees one active inventory record per product.

drop trigger if exists trg_inventory_updated_at on inventory;
create trigger trg_inventory_updated_at
  before update on inventory
  for each row execute function set_updated_at();

create table if not exists inventory_transactions (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists idx_inventory_transactions_inventory_id on inventory_transactions (inventory_id);
create index if not exists idx_inventory_transactions_product_id on inventory_transactions (product_id);
create index if not exists idx_inventory_transactions_created_at on inventory_transactions (created_at desc);
-- Used to check idempotently whether a given order's stock has
-- already been reduced (or restored) before creating another
-- Sale/Return transaction for it.
create index if not exists idx_inventory_transactions_related_order_id on inventory_transactions (related_order_id);

-- Hard guarantee that an order's stock can only ever be reduced once
-- and restored once, even if two "Complete"/"reverse" requests race.
-- Combined with the service-layer idempotency check, this makes a
-- double stock reduction (or double restoration) impossible.
create unique index if not exists uq_inventory_sale_per_order
  on inventory_transactions (related_order_id) where transaction_type = 'Sale';

create unique index if not exists uq_inventory_return_per_order
  on inventory_transactions (related_order_id) where transaction_type = 'Return';

alter table inventory enable row level security;
alter table inventory_transactions enable row level security;
-- No anon policies: inventory is admin-only and always accessed
-- server-side with the service role key.

-- ------------------------------------------------------------
-- BASE TABLE PRIVILEGES (see the matching note in schema.sql —
-- RLS alone isn't enough; the role also needs a baseline GRANT).
-- Re-running this against every table in the schema keeps it
-- correct even if this file is applied on its own.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select on tables to anon;
