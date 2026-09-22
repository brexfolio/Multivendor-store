-- ============================================================
-- Habentech Electronics — Supabase schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in (
    'Smartphones', 'Laptops', 'Tablets', 'Accessories',
    'Smart Watches', 'Gaming', 'Other'
  )),
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'ETB',
  condition text not null check (condition in ('Brand New', 'Used', 'Refurbished')),
  description text not null default '',
  availability text not null default 'Available' check (availability in (
    'Available', 'Low Stock', 'Sold', 'Unavailable'
  )),
  featured boolean not null default false,
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

create index if not exists idx_products_category on products (category);
create index if not exists idx_products_availability on products (availability);
create index if not exists idx_products_featured on products (featured);
create index if not exists idx_products_created_at on products (created_at desc);

-- ------------------------------------------------------------
-- PRODUCT IMAGES
-- ------------------------------------------------------------
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  telegram_file_id text,
  image_url text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product_id on product_images (product_id);

-- ------------------------------------------------------------
-- PRODUCT SPECIFICATIONS
-- ------------------------------------------------------------
create table if not exists product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  label text not null,
  value text not null,
  display_order integer not null default 0
);

create index if not exists idx_product_specifications_product_id on product_specifications (product_id);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  telegram_user_id text not null,
  customer_name text not null,
  username text,
  quantity integer not null check (quantity > 0),
  total_price numeric(12, 2) not null,
  status text not null default 'Pending' check (status in (
    'Pending', 'Confirmed', 'Completed', 'Cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_product_id on orders (product_id);
create index if not exists idx_orders_status on orders (status);
create index if not exists idx_orders_telegram_user_id on orders (telegram_user_id);

-- ------------------------------------------------------------
-- PRODUCT REQUESTS
-- ------------------------------------------------------------
create table if not exists product_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  telegram_user_id text not null,
  customer_name text not null,
  username text,
  status text not null default 'Pending' check (status in (
    'Pending', 'Contacted', 'Completed', 'Sold', 'Unavailable'
  )),
  created_at timestamptz not null default now()
);

create index if not exists idx_product_requests_product_id on product_requests (product_id);
create index if not exists idx_product_requests_status on product_requests (status);

-- ------------------------------------------------------------
-- STORE SETTINGS (single row)
-- ------------------------------------------------------------
create table if not exists store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'Habentech Electronics',
  store_description text not null default 'Your trusted electronics store on Telegram.',
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
select 'Habentech Electronics', 'Your trusted electronics store on Telegram.'
where not exists (select 1 from store_settings);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row execute function set_updated_at();

drop trigger if exists trg_store_settings_updated_at on store_settings;
create trigger trg_store_settings_updated_at
  before update on store_settings
  for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- All tables are locked down from the anon/public API.
-- The server only ever talks to Supabase using the
-- service role key (which bypasses RLS), so the app's own
-- authorization logic (Telegram initData + ADMIN_TELEGRAM_ID)
-- is the real gate. RLS here is defense-in-depth in case the
-- anon key is ever used directly against PostgREST.
-- ------------------------------------------------------------
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_specifications enable row level security;
alter table orders enable row level security;
alter table product_requests enable row level security;
alter table store_settings enable row level security;

drop policy if exists "public read available products" on products;
create policy "public read available products"
  on products for select
  to anon
  using (availability <> 'Unavailable');

drop policy if exists "public read product images" on product_images;
create policy "public read product images"
  on product_images for select
  to anon
  using (true);

drop policy if exists "public read product specifications" on product_specifications;
create policy "public read product specifications"
  on product_specifications for select
  to anon
  using (true);

drop policy if exists "public read store settings" on store_settings;
create policy "public read store settings"
  on store_settings for select
  to anon
  using (true);

-- ------------------------------------------------------------
-- BASE TABLE PRIVILEGES
-- RLS policies only control which *rows* a role can see — the
-- role still needs a baseline GRANT on the table itself, or every
-- query (including from service_role, which bypasses RLS but not
-- GRANTs) is rejected with "permission denied for table ...".
-- Some Supabase project configurations (e.g. creating the project
-- with "Automatically expose new tables" turned off) don't apply
-- this automatically, so it's done explicitly here. Granting
-- SELECT to `anon` is safe: RLS is enabled on every table above,
-- so anon still only sees rows the policies above allow (or zero
-- rows on tables with no anon policy, like orders).
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant select on all tables in schema public to anon;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select on tables to anon;

-- No anon policies exist for orders / product_requests (no direct
-- client access — all writes and reads go through server routes
-- using the service role key), and no anon write policies exist
-- for products / product_images / product_specifications either.
