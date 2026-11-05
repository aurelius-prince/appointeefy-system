-- Run once in the Supabase SQL Editor (after secure_appointments.sql).
-- Closes public access to payments, discounts, services, pet types, and account details,
-- and limits logged-in providers to their own records.

create or replace function public.app_guard_account_update()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if current_user = 'authenticated' and not public.app_is_superadmin() and (
    new.id is distinct from old.id
    or new.account_code is distinct from old.account_code
    or new.email is distinct from old.email
    or new.slug is distinct from old.slug
    or new.status is distinct from old.status
    or new.trial_ends is distinct from old.trial_ends
    or new.subscribed_until is distinct from old.subscribed_until
  ) then
    raise exception 'Only a superadmin can change account status or subscription fields.';
  end if;
  return new;
end;
$fn$;

drop trigger if exists app_guard_account_update on public.accounts;
create trigger app_guard_account_update before update on public.accounts
for each row execute function public.app_guard_account_update();

-- accounts: the public page only needs to turn a slug into an account id.
drop policy if exists authenticated_insert_accounts on public.accounts;
drop policy if exists superadmin_insert_accounts on public.accounts;
drop policy if exists authenticated_update_accounts on public.accounts;
drop policy if exists app_accounts_insert on public.accounts;
drop policy if exists app_accounts_update on public.accounts;
revoke all on public.accounts from anon;
grant select (id, slug) on public.accounts to anon;
create policy app_accounts_insert on public.accounts for insert to authenticated
with check (public.app_is_superadmin() or (lower(email) = lower(auth.jwt()->>'email') and status = 'waitlisted'));
create policy app_accounts_update on public.accounts for update to authenticated
using (public.app_owns_account(id) or public.app_is_superadmin())
with check (public.app_owns_account(id) or public.app_is_superadmin());

-- users: providers can only see and create their own admin profile.
drop policy if exists authenticated_insert_users on public.users;
drop policy if exists superadmin_insert_users on public.users;
drop policy if exists superadmin_read_users on public.users;
drop policy if exists users_select_policy on public.users;
drop policy if exists app_users_read on public.users;
drop policy if exists app_users_insert on public.users;
revoke all on public.users from anon;
create policy app_users_read on public.users for select to authenticated
using (lower(email) = lower(auth.jwt()->>'email') or public.app_is_superadmin());
create policy app_users_insert on public.users for insert to authenticated
with check (public.app_is_superadmin() or (
  lower(email) = lower(auth.jwt()->>'email') and role = 'admin' and public.app_owns_account(account_id)
));

-- registration_requests: only superadmins can read submitted requests.
drop policy if exists superadmin_read_registrations on public.registration_requests;
drop policy if exists app_registrations_read on public.registration_requests;
create policy app_registrations_read on public.registration_requests for select to authenticated
using (public.app_is_superadmin());

-- payments: providers can create and cancel their own, but cannot mark one as paid.
alter table public.payments enable row level security;
drop policy if exists app_payments_read on public.payments;
drop policy if exists app_payments_insert on public.payments;
drop policy if exists app_payments_update on public.payments;
drop policy if exists app_payments_delete on public.payments;
revoke all on public.payments from anon, authenticated;
grant select, insert, update, delete on public.payments to authenticated;
create policy app_payments_read on public.payments for select to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin());
create policy app_payments_insert on public.payments for insert to authenticated
with check (public.app_is_superadmin() or (
  public.app_owns_account(account_id) and status in ('pending', 'awaiting_payment')
));
create policy app_payments_update on public.payments for update to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin())
with check (public.app_is_superadmin() or (
  public.app_owns_account(account_id) and status in ('pending', 'awaiting_payment', 'failed')
));
create policy app_payments_delete on public.payments for delete to authenticated
using (public.app_is_superadmin());

-- discounts: superadmins manage codes; providers can only read active ones.
alter table public.discounts enable row level security;
drop policy if exists app_discounts_read on public.discounts;
drop policy if exists app_discounts_manage on public.discounts;
revoke all on public.discounts from anon, authenticated;
grant select, insert, update, delete on public.discounts to authenticated;
create policy app_discounts_read on public.discounts for select to authenticated
using (is_active or public.app_is_superadmin());
create policy app_discounts_manage on public.discounts for all to authenticated
using (public.app_is_superadmin()) with check (public.app_is_superadmin());

-- services: public page content, editable only by the owning provider or a superadmin.
alter table public.services enable row level security;
drop policy if exists services_policy on public.services;
drop policy if exists public_read_services on public.services;
drop policy if exists app_services_read on public.services;
drop policy if exists app_services_insert on public.services;
drop policy if exists app_services_update on public.services;
drop policy if exists app_services_delete on public.services;
revoke all on public.services from anon, authenticated;
grant select on public.services to anon;
grant select, insert, update, delete on public.services to authenticated;
create policy app_services_read on public.services for select to anon, authenticated using (true);
create policy app_services_insert on public.services for insert to authenticated
with check (public.app_owns_account(account_id) or public.app_is_superadmin());
create policy app_services_update on public.services for update to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin())
with check (public.app_owns_account(account_id) or public.app_is_superadmin());
create policy app_services_delete on public.services for delete to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin());

-- provider_pet_types: same rules as services.
alter table public.provider_pet_types enable row level security;
drop policy if exists pet_types_policy on public.provider_pet_types;
drop policy if exists public_read_pet_types on public.provider_pet_types;
drop policy if exists app_pet_types_read on public.provider_pet_types;
drop policy if exists app_pet_types_insert on public.provider_pet_types;
drop policy if exists app_pet_types_delete on public.provider_pet_types;
revoke all on public.provider_pet_types from anon, authenticated;
grant select on public.provider_pet_types to anon;
grant select, insert, update, delete on public.provider_pet_types to authenticated;
create policy app_pet_types_read on public.provider_pet_types for select to anon, authenticated using (true);
create policy app_pet_types_insert on public.provider_pet_types for insert to authenticated
with check (public.app_owns_account(account_id) or public.app_is_superadmin());
create policy app_pet_types_delete on public.provider_pet_types for delete to authenticated
using (public.app_owns_account(account_id) or public.app_is_superadmin());
