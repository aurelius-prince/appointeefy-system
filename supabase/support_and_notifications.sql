-- Run once in the Supabase SQL Editor for the Appointeefy project.
-- This migration adds account-scoped support tickets, protects notifications,
-- and expires unfinished payment requests once per minute.

create extension if not exists pg_cron;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"superadmin"}'::jsonb
where raw_user_meta_data->>'role' = 'superadmin'
  and raw_app_meta_data->>'role' is distinct from 'superadmin';

create or replace function public.app_is_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and raw_app_meta_data->>'role' = 'superadmin'
  );
$$;
revoke all on function public.app_is_superadmin() from public;
grant execute on function public.app_is_superadmin() to authenticated;

create or replace function public.app_owns_account(target_account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.accounts
    where id = target_account_id and lower(email) = lower(auth.jwt()->>'email')
  );
$$;
revoke all on function public.app_owns_account(uuid) from public;
grant execute on function public.app_owns_account(uuid) to authenticated;

alter table public.notifications enable row level security;
grant select, insert, delete on public.notifications to authenticated;
drop policy if exists app_notifications_read on public.notifications;
drop policy if exists app_notifications_insert on public.notifications;
drop policy if exists app_notifications_delete on public.notifications;
create policy app_notifications_read on public.notifications for select to authenticated
using (public.app_is_superadmin() or exists (
  select 1 from public.accounts a where lower(a.email) = lower(auth.jwt()->>'email')
    and (to_account_id is null or a.id = to_account_id)
));
create policy app_notifications_insert on public.notifications for insert to authenticated
with check (public.app_is_superadmin());
create policy app_notifications_delete on public.notifications for delete to authenticated
using (public.app_is_superadmin());

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  subject text not null check (length(trim(subject)) between 5 and 120),
  category text not null default 'General',
  description text not null check (length(trim(description)) between 15 and 4000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_account_created_idx on public.support_tickets(account_id, created_at desc);
create index if not exists support_tickets_status_created_idx on public.support_tickets(status, created_at desc);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_role text not null check (sender_role in ('provider', 'superadmin')),
  body text not null check (length(trim(body)) between 2 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_created_idx on public.support_messages(ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
grant select, insert, update on public.support_tickets to authenticated;
grant select, insert on public.support_messages to authenticated;

drop policy if exists app_tickets_select on public.support_tickets;
drop policy if exists app_tickets_insert on public.support_tickets;
drop policy if exists app_tickets_update on public.support_tickets;
create policy app_tickets_select on public.support_tickets for select to authenticated
using (public.app_is_superadmin() or public.app_owns_account(account_id));
create policy app_tickets_insert on public.support_tickets for insert to authenticated
with check (public.app_owns_account(account_id) and status = 'open');
create policy app_tickets_update on public.support_tickets for update to authenticated
using (public.app_is_superadmin()) with check (public.app_is_superadmin());

drop policy if exists app_support_messages_select on public.support_messages;
drop policy if exists app_support_messages_insert_provider on public.support_messages;
drop policy if exists app_support_messages_insert_admin on public.support_messages;
create policy app_support_messages_select on public.support_messages for select to authenticated
using (exists (select 1 from public.support_tickets t where t.id = ticket_id));
create policy app_support_messages_insert_provider on public.support_messages for insert to authenticated
with check (sender_role = 'provider' and exists (
  select 1 from public.support_tickets t where t.id = ticket_id
    and public.app_owns_account(t.account_id) and t.status <> 'closed'
));
create policy app_support_messages_insert_admin on public.support_messages for insert to authenticated
with check (sender_role = 'superadmin' and public.app_is_superadmin());

create or replace function public.limit_support_requests()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.support_tickets
      where account_id = new.account_id and status in ('open', 'in_progress')) >= 3 then
    raise exception 'You already have three active support tickets.';
  end if;
  if exists (select 1 from public.support_tickets
      where account_id = new.account_id and created_at > now() - interval '10 minutes') then
    raise exception 'Please wait 10 minutes before creating another ticket.';
  end if;
  return new;
end;
$$;
drop trigger if exists app_limit_support_requests on public.support_tickets;
create trigger app_limit_support_requests before insert on public.support_tickets
for each row execute function public.limit_support_requests();

create or replace function public.touch_support_ticket()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.support_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;
drop trigger if exists app_touch_support_ticket on public.support_messages;
create trigger app_touch_support_ticket after insert on public.support_messages
for each row execute function public.touch_support_ticket();

create or replace function public.expire_awaiting_payments()
returns integer language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
  update public.payments set status = 'failed'
  where status = 'awaiting_payment' and created_at <= now() - interval '1 hour';
  get diagnostics changed = row_count;
  return changed;
end;
$$;
revoke all on function public.expire_awaiting_payments() from public, anon, authenticated;
select cron.schedule('appointeefy-expire-awaiting-payments', '* * * * *',
  'select public.expire_awaiting_payments()')
where not exists (select 1 from cron.job where jobname = 'appointeefy-expire-awaiting-payments');
select public.expire_awaiting_payments();
