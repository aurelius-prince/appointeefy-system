-- Run once in the Supabase SQL Editor.
-- Allows the Paid step of the appointment flow. Without it, marking a booking as paid fails in the database.
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
check (status in ('pending', 'confirmed', 'approved', 'awaiting payment', 'paid', 'completed', 'cancelled'));
