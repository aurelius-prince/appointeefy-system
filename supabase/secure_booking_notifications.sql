-- Run once in the Supabase SQL Editor (after booking_page_settings.sql).
-- Closes public write access to notifications. Booking notifications are now created by the database
-- when an appointment is inserted, so nobody can send a notification without creating a real booking record.

create or replace function public.notify_provider_of_booking()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then
    begin
      insert into public.notifications (type, title, message, to_account_id)
      values (
        'message', -- notifications_type_check only allows 'announcement' and 'message'.
        'New booking request',
        left(coalesce(nullif(trim(new.customer_name), ''), 'A customer'), 80)
          || ' submitted a booking request for '
          || coalesce(to_char(coalesce(new.check_in, new.date), 'Mon FMDD, YYYY'), 'an upcoming date') || '.',
        new.account_id
      );
    exception when others then
      -- A notification problem must never cancel the customer's booking.
      raise warning 'Booking notification failed: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_provider_of_booking() from public, anon, authenticated;

drop trigger if exists app_notify_provider_of_booking on public.appointments;
create trigger app_notify_provider_of_booking after insert on public.appointments
for each row execute function public.notify_provider_of_booking();

-- "Public can create booking notifications" allowed any insert (including broadcasts to every provider).
drop policy if exists "Public can create booking notifications" on public.notifications;
drop policy if exists app_notifications_public_booking on public.notifications;
revoke insert on public.notifications from anon;
