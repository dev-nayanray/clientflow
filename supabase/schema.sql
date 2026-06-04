-- ═══════════════════════════════════════════════════════════════════════════════
-- ClientFlow AI — Supabase Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run All
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── IMPORTANT: Disable email confirmation for easier onboarding ───────────────
-- Do this in Supabase Dashboard → Authentication → Settings → Email Confirm = OFF

-- ── 1. Profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  full_name     text,
  company_name  text,
  email         text,
  role          text default 'user' check (role in ('user','admin','superadmin')),
  country       text,
  niche         text,
  service       text,
  calendly_link text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
-- Admins can see all profiles
create policy "profiles_admin" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
);

-- ── 2. Auto-create profile on signup ─────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 3. Subscriptions ─────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  plan               text not null check (plan in ('monthly','yearly','lifetime','free')),
  status             text not null default 'active' check (status in ('active','cancelled','expired','past_due')),
  started_at         timestamptz default now(),
  expires_at         timestamptz,
  stripe_session_id  text,
  stripe_customer_id text,
  stripe_sub_id      text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy "subs_select" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subs_insert" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subs_update" on public.subscriptions for update using (auth.uid() = user_id);
-- Admin can see all subs
create policy "subs_admin" on public.subscriptions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
);

-- ── 4. Leads ──────────────────────────────────────────────────────────────────
create table if not exists public.leads (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  contact     text, email text, website text, phone text,
  platform    text, niche text, service text, country text,
  pain_point  text, size text, verified boolean default false,
  status      text default 'New', notes text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table public.leads enable row level security;
create policy "leads_all" on public.leads for all using (auth.uid() = user_id);

-- ── 5. Projects ───────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  client_name  text, client_email text, service text,
  budget       text, deadline date, status text default 'Active', description text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
alter table public.projects enable row level security;
create policy "projects_all" on public.projects for all using (auth.uid() = user_id);

-- ── 6. App usage analytics (for admin dashboard) ──────────────────────────────
create table if not exists public.usage_events (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  event      text not null,
  metadata   jsonb,
  created_at timestamptz default now()
);
alter table public.usage_events enable row level security;
create policy "usage_insert" on public.usage_events for insert with check (auth.uid() = user_id);
create policy "usage_admin" on public.usage_events for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin'))
);

-- ── 7. Helper functions ───────────────────────────────────────────────────────
create or replace function public.has_active_subscription(p_user_id uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = p_user_id and status = 'active'
    and (expires_at is null or expires_at > now())
  );
$$;

-- Admin stats function
create or replace function public.get_admin_stats()
returns json language plpgsql security definer as $$
declare
  result json;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','superadmin')) then
    raise exception 'Unauthorized';
  end if;
  select json_build_object(
    'total_users', (select count(*) from auth.users),
    'active_subs', (select count(*) from public.subscriptions where status='active' and (expires_at is null or expires_at > now())),
    'monthly_subs', (select count(*) from public.subscriptions where plan='monthly' and status='active'),
    'yearly_subs', (select count(*) from public.subscriptions where plan='yearly' and status='active'),
    'lifetime_subs', (select count(*) from public.subscriptions where plan='lifetime' and status='active'),
    'mrr', (select coalesce(
      (select count(*) from public.subscriptions where plan='monthly' and status='active') * 1 +
      (select count(*) from public.subscriptions where plan='yearly' and status='active') * 0.83,
    0)),
    'total_leads', (select count(*) from public.leads),
    'total_projects', (select count(*) from public.projects),
    'new_users_today', (select count(*) from auth.users where created_at > now() - interval '24 hours'),
    'new_users_week', (select count(*) from auth.users where created_at > now() - interval '7 days')
  ) into result;
  return result;
end;
$$;

-- ── 8. Set yourself as superadmin ─────────────────────────────────────────────
-- IMPORTANT: After running schema, run this with YOUR email:
-- update public.profiles set role = 'superadmin' where email = 'your@email.com';

-- ── 9. Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_subs_user_id on public.subscriptions(user_id);
create index if not exists idx_subs_status  on public.subscriptions(status);
create index if not exists idx_leads_user   on public.leads(user_id);
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_usage_user   on public.usage_events(user_id);
create index if not exists idx_profiles_role on public.profiles(role);

-- ── Done! ──────────────────────────────────────────────────────────────────────
-- Next steps:
-- 1. Supabase Dashboard → Authentication → Email Templates → customize
-- 2. Authentication → Settings → Disable "Enable email confirmations" (for easier testing)
-- 3. Run: update public.profiles set role = 'superadmin' where email = 'YOUR_EMAIL';
