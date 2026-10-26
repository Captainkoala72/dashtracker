-- DashTracker: intentionally public, single shared personal dataset.
-- Run against this dedicated project only. No service-role key is needed in the website.
create table if not exists public.dash_shifts (
 id uuid primary key,
 date date not null check (date >= date '2026-01-01'),
 base_pay numeric(12,2) not null check (base_pay >= 0 and base_pay < 1000000),
 tips numeric(12,2) not null check (tips >= 0 and tips < 1000000),
 miles numeric(10,2) not null check (miles >= 0 and miles < 100000),
 minutes integer not null check (minutes > 0 and minutes <= 1440),
 notes text not null default '' check (length(notes) <= 2000),
 updated_at timestamptz not null default now()
);
create index if not exists dash_shifts_date_idx on public.dash_shifts(date desc);
create table if not exists public.dash_expenses (
 id uuid primary key,
 date date not null check (date >= date '2026-01-01'),
 category text not null check (category in ('gas','maintenance')),
 amount numeric(12,2) not null check (amount > 0 and amount < 1000000),
 business_percent numeric(5,2) not null default 100 check (business_percent >= 0 and business_percent <= 100),
 notes text not null default '' check (length(notes) <= 2000),
 updated_at timestamptz not null default now()
);
create index if not exists dash_expenses_date_idx on public.dash_expenses(date desc);
create table if not exists public.dash_settings (
 year integer primary key check (year between 2026 and 9999),
 other_income numeric(12,2) not null default 0 check (other_income >= 0 and other_income < 1000000),
 federal_paid numeric(12,2) not null default 0 check (federal_paid >= 0 and federal_paid < 1000000),
 state_paid numeric(12,2) not null default 0 check (state_paid >= 0 and state_paid < 1000000),
 default_business_percent numeric(5,2) not null default 100 check (default_business_percent between 0 and 100),
 tips_eligible boolean not null default true,
 qbi_enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.dash_shifts enable row level security;
alter table public.dash_expenses enable row level security;
alter table public.dash_settings enable row level security;
-- Public access is intentional and explicitly requested by the owner.
-- RLS still confines the API to these specific tables. No ownership/auth.uid() model is used.
drop policy if exists "Public tracker access" on public.dash_shifts;
create policy "Public tracker access" on public.dash_shifts for all to anon using (true) with check (true);
drop policy if exists "Public tracker access" on public.dash_expenses;
create policy "Public tracker access" on public.dash_expenses for all to anon using (true) with check (true);
drop policy if exists "Public tracker access" on public.dash_settings;
create policy "Public tracker access" on public.dash_settings for all to anon using (true) with check (true);
grant usage on schema public to anon;
grant select, insert, update, delete on public.dash_shifts, public.dash_expenses, public.dash_settings to anon;
-- Realtime notification is an enhancement. Polling/focus refresh also keep devices current.
do $$ begin
 if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dash_shifts') then alter publication supabase_realtime add table public.dash_shifts; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dash_expenses') then alter publication supabase_realtime add table public.dash_expenses; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='dash_settings') then alter publication supabase_realtime add table public.dash_settings; end if;
 end if;
end $$;
