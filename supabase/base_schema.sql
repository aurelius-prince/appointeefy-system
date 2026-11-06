-- Base schema for a fresh Appointeefy database (structure only, no customer data).
-- Order for a new project: this file, then support_and_notifications, booking_page_settings,
-- secure_booking_notifications, secure_appointments, secure_public_tables, payments_quantity,
-- payment_integrity, appointments_paid_status. Use "Run and enable RLS" when the dashboard asks.
create table public.accounts (id uuid not null default gen_random_uuid(), account_code text, name text not null, email text not null, phone text, business_type text, slug text, status text default 'trial'::text, trial_ends date, subscribed_until date, created_at timestamp with time zone default now(), address text, bio text, logo_url text);
create table public.appointments (id uuid not null default gen_random_uuid(), account_id uuid not null, txn_code text, customer_name text not null, customer_phone text, customer_email text, customer_facebook text, pet text, pet_type text, service_id uuid, service_name text, date date, "time" time without time zone, check_in date, check_out date, duration numeric(5,2), base_price numeric(10,2), final_price numeric(10,2), price_note text, notes text, status text default 'pending'::text, created_at timestamp with time zone default now(), payments jsonb default '[]'::jsonb, logs jsonb default '[]'::jsonb, additional numeric(10,2), end_time text, pricing_type text);
create table public.discounts (id uuid not null default gen_random_uuid(), code text not null, type text, value numeric(10,2), applicable text, usage_limit integer, used_count integer default 0, expiry_date date, is_active boolean default true, created_at timestamp with time zone default now());
create table public.notifications (id uuid not null default gen_random_uuid(), type text, title text not null, message text, to_account_id uuid, image_url text, sent_at timestamp with time zone default now());
create table public.payments (id uuid not null default gen_random_uuid(), account_id uuid, name text, email text, business_type text, plan text, amount numeric, method text, reference text, proof text, discount_code text, status text default 'pending'::text, created_at timestamp with time zone default now(), quantity integer not null default 1);
create table public.plans (id text not null, name text not null, price numeric not null);
create table public.provider_pet_types (id uuid not null default gen_random_uuid(), account_id uuid not null, name text not null);
create table public.registration_requests (id uuid not null default gen_random_uuid(), req_code text, name text not null, email text not null, phone text, business_type text, message text, status text default 'pending'::text, rejection_reason text, submitted_at timestamp with time zone default now(), business_name text);
create table public.services (id uuid not null default gen_random_uuid(), account_id uuid not null, name text not null, price numeric(10,2) not null, duration numeric(5,2), description text, max_pets integer default 10, mixed_types boolean default false, created_at timestamp with time zone default now(), pricing_type text default 'per_hour'::text);
create table public.users (id uuid not null default gen_random_uuid(), account_id uuid, name text not null, email text not null, role text not null, created_at timestamp with time zone default now());

alter table public.accounts add constraint accounts_account_code_key UNIQUE (account_code);
alter table public.accounts add constraint accounts_email_key UNIQUE (email);
alter table public.accounts add constraint accounts_pkey PRIMARY KEY (id);
alter table public.accounts add constraint accounts_slug_key UNIQUE (slug);
alter table public.appointments add constraint appointments_pkey PRIMARY KEY (id);
alter table public.appointments add constraint appointments_txn_code_key UNIQUE (txn_code);
alter table public.discounts add constraint discounts_code_key UNIQUE (code);
alter table public.discounts add constraint discounts_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.payments add constraint payments_pkey PRIMARY KEY (id);
alter table public.plans add constraint plans_pkey PRIMARY KEY (id);
alter table public.provider_pet_types add constraint provider_pet_types_pkey PRIMARY KEY (id);
alter table public.registration_requests add constraint registration_requests_pkey PRIMARY KEY (id);
alter table public.registration_requests add constraint registration_requests_req_code_key UNIQUE (req_code);
alter table public.services add constraint services_pkey PRIMARY KEY (id);
alter table public.users add constraint users_email_key UNIQUE (email);
alter table public.users add constraint users_pkey PRIMARY KEY (id);
alter table public.accounts add constraint accounts_status_check CHECK ((status = ANY (ARRAY['waitlisted'::text, 'trial'::text, 'monthly'::text, 'annual'::text, 'expired'::text, 'suspended'::text])));
alter table public.appointments add constraint appointments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'approved'::text, 'awaiting payment'::text, 'paid'::text, 'completed'::text, 'cancelled'::text])));
alter table public.discounts add constraint discounts_applicable_check CHECK ((applicable = ANY (ARRAY['monthly'::text, 'annual'::text, 'both'::text])));
alter table public.discounts add constraint discounts_type_check CHECK ((type = ANY (ARRAY['percentage'::text, 'fixed'::text])));
alter table public.notifications add constraint notifications_type_check CHECK ((type = ANY (ARRAY['announcement'::text, 'message'::text])));
alter table public.registration_requests add constraint registration_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
alter table public.services add constraint services_pricing_type_check CHECK ((pricing_type = ANY (ARRAY['per_hour'::text, 'per_day'::text])));
alter table public.users add constraint users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text])));
alter table public.appointments add constraint appointments_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.appointments add constraint appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
alter table public.notifications add constraint notifications_to_account_id_fkey FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.provider_pet_types add constraint provider_pet_types_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.services add constraint services_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;
alter table public.users add constraint users_account_id_fkey FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL;

alter table public.plans enable row level security;
alter table public.registration_requests enable row level security;
create policy "Public can read plans" on public.plans for SELECT to anon, authenticated using (true);
create policy public_insert_registration on public.registration_requests for INSERT to anon with check (true);
insert into public.plans (id, name, price) values ('monthly', 'Monthly', 199), ('annual', 'Annual', 1799);

-- Read policies that production already had on accounts (visitors only get id and slug through column grants).
create policy public_read_accounts on public.accounts for select to public using (true);
create policy superadmin_read_accounts on public.accounts for select to authenticated using (true);
