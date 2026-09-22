-- ============================================================
-- Migration: Add Telegram Group Publishing Support
-- ============================================================

-- 1. Extend store_settings table
alter table store_settings add column if not exists telegram_group text;
alter table store_settings add column if not exists telegram_group_title text;
alter table store_settings add column if not exists telegram_group_thread_id text;
alter table store_settings add column if not exists publish_target text not null default 'channel';

-- 2. Extend products table for group publishing metadata
alter table products add column if not exists group_published boolean not null default false;
alter table products add column if not exists telegram_group_id text;
alter table products add column if not exists telegram_group_message_id text;
alter table products add column if not exists telegram_group_media_message_ids jsonb;
alter table products add column if not exists telegram_group_thread_id text;
alter table products add column if not exists group_published_at timestamptz;
alter table products add column if not exists publish_target text;
