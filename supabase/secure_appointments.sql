-- Run once in the Supabase SQL Editor (after support_and_notifications.sql).
-- Turns on row level security for appointments, which was off, so the existing policies were not enforced.
-- Public visitors keep only what the booking page needs: submitting a pending booking and reading
-- schedule columns for availability. Customer details are limited to the owning provider and superadmins.

alter table public.appointments enable row level security;

drop policy if exists admin_read_appointments on public.appointments;
drop policy if exists admin_update_appointments on public.appointments;
drop policy if exists public_insert_appointments on public.appointments;
drop policy if exists public_read_appointments on public.appointments;
drop policy if exists app_appointments_availability on public.appointments;
drop policy if exists app_appointments_public_insert on public.appointments;
drop policy if exists app_appointments_owner_read on public.appointments;
drop policy if exists app_appointments_owner_update on public.appointments;
drop policy if exists app_appointments_owner_delete on public.appointments;

revoke all on public.appointments from anon, authenticated;

grant select (account_id, date, time, check_in, check_out, end_time, status, pricing_type) on public.appointments to anon;
grant insert (
  account_id, txn_code, customer_name, customer_phone, customer_email, customer_facebook,
  pet, pet_type, service_id, service_name, date, time, check_in, check_out, end_time,
  pricing_type, duration, base_price, final_price, notes, status
) on public.appointments to anon;
grant select, insert, update, delete on public.appointments to authenticated;

create policy app_appointments_availability on public.appointments for select to anon
using (status in ('pending', 'approved', 'confirmed', 'awaiting payment', 'paid'));

create policy app_appointments_public_insert on public.appointments for insert to anon, authenticated
with check (status = 'pending');

create policy app_appointments_owner_read on public.appointments for select to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin());

create policy app_appointments_owner_update on public.appointments for update to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin())
with check (public.app_owns_account(account_id) or public.app_is_superadmin());

create policy app_appointments_owner_delete on public.appointments for delete to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin());
