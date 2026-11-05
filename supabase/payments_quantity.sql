-- Run once in the Supabase SQL Editor.
-- Stores how many months or years a subscription payment covers. AdminSubscription.jsx already sends this value.
alter table public.payments add column if not exists quantity integer not null default 1;
