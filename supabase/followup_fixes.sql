-- Run once in the Supabase SQL Editor (after payment_integrity.sql).
-- 1) Lets a superadmin change plan prices (the update was silently blocked).
-- 2) Counts a discount code as used when its payment is verified (it was never counted, so limits did nothing).
-- 3) Slows down booking spam: one network address can send at most 10 booking requests per hour,
--    and text fields get sensible length limits. Real customers are not affected.

-- 1) Plan prices
grant update on public.plans to authenticated;
drop policy if exists app_plans_update on public.plans;
create policy app_plans_update on public.plans for update to authenticated
using (public.app_is_superadmin()) with check (public.app_is_superadmin());

-- 2) Discount usage
create or replace function public.count_discount_use()
returns trigger language plpgsql security definer set search_path = '' as $fn$
begin
  if new.discount_code is not null then
    if new.status = 'verified' and old.status is distinct from 'verified' then
      update public.discounts set used_count = coalesce(used_count, 0) + 1 where code = new.discount_code;
    elsif old.status = 'verified' and new.status is distinct from 'verified' then
      update public.discounts set used_count = greatest(coalesce(used_count, 0) - 1, 0) where code = new.discount_code;
    end if;
  end if;
  return new;
end;
$fn$;
revoke all on function public.count_discount_use() from public, anon, authenticated;
drop trigger if exists app_count_discount_use on public.payments;
create trigger app_count_discount_use after update of status on public.payments
for each row execute function public.count_discount_use();

-- 3) Booking spam limit (only applies to anonymous visitors; providers and superadmins are not limited)
create table if not exists public.booking_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists booking_attempts_ip_created_idx on public.booking_attempts (ip, created_at desc);
alter table public.booking_attempts enable row level security;
revoke all on public.booking_attempts from anon, authenticated;

create or replace function public.limit_public_bookings()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare
  headers json;
  client_ip text;
  request_role text;
begin
  -- This function runs as its owner, so current_user is not the visitor. Read the role the request came with.
  begin
    request_role := nullif(current_setting('request.jwt.claims', true), '')::json->>'role';
  exception when others then
    request_role := null;
  end;
  if coalesce(request_role, '') <> 'anon' then
    return new;
  end if;

  if length(coalesce(new.customer_name, '')) not between 1 and 100
    or length(coalesce(new.customer_phone, '')) > 40
    or length(coalesce(new.customer_email, '')) > 200
    or length(coalesce(new.customer_facebook, '')) > 300
    or length(coalesce(new.notes, '')) > 2000
    or length(coalesce(new.pet, '')) > 300
    or length(coalesce(new.pet_type, '')) > 300 then
    raise exception 'Some booking details are too long or missing.';
  end if;

  begin
    headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    headers := null;
  end;
  client_ip := trim(split_part(coalesce(headers->>'x-forwarded-for', headers->>'cf-connecting-ip', ''), ',', 1));

  if client_ip <> '' then
    if (select count(*) from public.booking_attempts
        where ip = client_ip and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'Too many booking requests from your network. Please try again later.';
    end if;
    insert into public.booking_attempts (ip) values (client_ip);
  end if;
  return new;
end;
$fn$;
revoke all on function public.limit_public_bookings() from public, anon, authenticated;
drop trigger if exists app_limit_public_bookings on public.appointments;
create trigger app_limit_public_bookings before insert on public.appointments
for each row execute function public.limit_public_bookings();

-- Keep the attempts table small: remove rows older than one day, every hour.
select cron.schedule('appointeefy-clean-booking-attempts', '15 * * * *',
  $cron$delete from public.booking_attempts where created_at < now() - interval '1 day'$cron$)
where not exists (select 1 from cron.job where jobname = 'appointeefy-clean-booking-attempts');
