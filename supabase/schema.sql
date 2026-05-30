-- ═══════════════════════════════════════════════════════════════════════════════
-- ClientFlow AI — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles table ─────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data
create table if not exists public.profiles (
  id              uuid references auth.users(id) on delete cascade primary key,
  full_name       text,
  company_name    text,
  email           text,
  country         text,
  niche           text,
  service         text,
  calendly_link   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- Users can only see and edit their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 2. Subscriptions table ────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  plan                text not null check (plan in ('monthly','yearly','lifetime','free')),
  status              text not null default 'active' check (status in ('active','cancelled','expired','past_due')),
  started_at          timestamptz default now(),
  expires_at          timestamptz,          -- null = lifetime (never expires)
  stripe_session_id   text,
  stripe_customer_id  text,
  stripe_sub_id       text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Only the service role (Stripe webhook) can insert/update subscriptions
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Allow users to insert their own subscription (for direct Stripe redirect flow)
create policy "Users can insert own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);


-- ── 3. Leads table (optional — sync from app) ─────────────────────────────────
create table if not exists public.leads (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  contact     text,
  email       text,
  website     text,
  phone       text,
  platform    text,
  niche       text,
  service     text,
  country     text,
  pain_point  text,
  size        text,
  verified    boolean default false,
  status      text default 'New',
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Users can manage own leads"
  on public.leads for all
  using (auth.uid() = user_id);


-- ── 4. Projects table (optional — sync from app) ──────────────────────────────
create table if not exists public.projects (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  name            text not null,
  client_name     text,
  client_email    text,
  service         text,
  budget          text,
  deadline        date,
  status          text default 'Active',
  description     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.projects enable row level security;

create policy "Users can manage own projects"
  on public.projects for all
  using (auth.uid() = user_id);


-- ── 5. Helper: check if user has active subscription ─────────────────────────
create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user_id
      and status = 'active'
      and (expires_at is null or expires_at > now())
  );
$$ language sql security definer;


-- ── 6. Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_subscriptions_user_id  on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status   on public.subscriptions(status);
create index if not exists idx_leads_user_id          on public.leads(user_id);
create index if not exists idx_projects_user_id       on public.projects(user_id);
