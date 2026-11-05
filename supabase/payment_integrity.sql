-- Run once in the Supabase SQL Editor (after secure_public_tables.sql and payments_quantity.sql).
-- Providers can no longer choose their own payment amount or duration. The database recalculates the amount
-- from plans and discounts, and only proof, reference, and allowed status changes can be edited afterward.

-- Plan prices are public. The app must read the same prices that this check uses.
grant select on public.plans to anon, authenticated;

create or replace function public.app_expected_payment_amount(p_plan text, p_quantity integer, p_discount text)
returns numeric language plpgsql stable security definer set search_path = '' as $fn$
declare
  plan_key text := lower(p_plan);
  base numeric;
  savings numeric := 0;
  d public.discounts%rowtype;
begin
  select price into base from public.plans where id = plan_key;
  if base is null then
    raise exception 'Unknown subscription plan.';
  end if;
  if p_discount is not null then
    select * into d from public.discounts
    where code = p_discount
      and is_active
      and expiry_date >= current_date
      and coalesce(used_count, 0) < coalesce(usage_limit, 0)
      and applicable in ('both', plan_key);
    if not found then
      raise exception 'Invalid or expired discount code.';
    end if;
    savings := case when d.type = 'percentage' then round(base * d.value / 100) else d.value end;
  end if;
  return greatest(0, base - savings) * p_quantity;
end;
$fn$;
revoke all on function public.app_expected_payment_amount(text, integer, text) from public, anon;
grant execute on function public.app_expected_payment_amount(text, integer, text) to authenticated;

create or replace function public.app_guard_payment()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if current_user <> 'authenticated' or public.app_is_superadmin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.quantity not between 1 and 99 then
      raise exception 'Payment duration must be between 1 and 99.';
    end if;
    if new.method is distinct from 'GCash' then
      raise exception 'Unsupported payment method.';
    end if;
    if new.amount is distinct from public.app_expected_payment_amount(new.plan, new.quantity, new.discount_code) then
      raise exception 'Payment amount does not match the current plan price.';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.account_id is distinct from old.account_id
    or new.name is distinct from old.name
    or new.email is distinct from old.email
    or new.business_type is distinct from old.business_type
    or new.plan is distinct from old.plan
    or new.amount is distinct from old.amount
    or new.quantity is distinct from old.quantity
    or new.method is distinct from old.method
    or new.discount_code is distinct from old.discount_code
    or new.created_at is distinct from old.created_at then
    raise exception 'Payment details cannot be changed after the transaction is created.';
  end if;

  if not (
    new.status = old.status and old.status in ('awaiting_payment', 'pending')
    or (old.status = 'awaiting_payment' and new.status in ('pending', 'failed'))
    or (old.status = 'pending' and new.status = 'failed')
  ) then
    raise exception 'This payment can no longer be changed.';
  end if;
  return new;
end;
$fn$;

drop trigger if exists app_guard_payment on public.payments;
create trigger app_guard_payment before insert or update on public.payments
for each row execute function public.app_guard_payment();
