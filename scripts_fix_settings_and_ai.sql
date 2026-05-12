-- Fix missing store_settings columns and add AI provider settings table
-- Run this in Supabase SQL Editor

begin;

alter table if exists store_settings
  add column if not exists notify_customer_line boolean default true,
  add column if not exists web_notifications_enabled boolean default true,
  add column if not exists line_oa_admin_id text,
  add column if not exists line_oa_id text,
  add column if not exists line_oa_link text,
  add column if not exists line_oa_channel_token text,
  add column if not exists line_oa_channel_secret text,
  add column if not exists ai_provider text default 'gemini',
  add column if not exists ai_model text default 'gemini-1.5-flash',
  add column if not exists ai_enabled boolean default true;

notify pgrst, 'reload schema';

commit;
