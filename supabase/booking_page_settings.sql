-- Run once in the Supabase SQL Editor (after support_and_notifications.sql).
-- 1) Stores each provider's booking-page settings in the database instead of browser localStorage,
--    so the public /book/:slug page shows the same content on every device.
-- Booking notifications are handled by secure_booking_notifications.sql.

create table if not exists public.booking_page_settings (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.booking_page_settings enable row level security;
grant select on public.booking_page_settings to anon, authenticated;
grant insert, update on public.booking_page_settings to authenticated;

drop policy if exists bps_public_read on public.booking_page_settings;
drop policy if exists bps_owner_insert on public.booking_page_settings;
drop policy if exists bps_owner_update on public.booking_page_settings;

-- The public booking page is anonymous, so settings must be world-readable (they are public page content).
create policy bps_public_read on public.booking_page_settings for select to anon, authenticated using (true);
create policy bps_owner_insert on public.booking_page_settings for insert to authenticated
with check (public.app_owns_account(account_id) or public.app_is_superadmin());
create policy bps_owner_update on public.booking_page_settings for update to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin())
with check (public.app_owns_account(account_id) or public.app_is_superadmin());
