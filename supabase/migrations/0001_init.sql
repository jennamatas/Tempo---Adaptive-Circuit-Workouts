-- Tempo — initial schema for Supabase (public schema + auth.users).
-- Mirrors the live app's denormalized data model: profiles, exercises,
-- workout_sessions. Idempotent so it can be re-applied safely.

-- ── profiles (1:1 with auth.users) ────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  fitness_level text not null default 'intermediate',
  body_weight_kg numeric not null default 75,
  weekly_goal int not null default 3,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── exercises (public reference library) ──────────────────────────────────────
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  instructions text,
  body_part text not null,
  phase text not null,
  movement_pattern text,
  muscle_groups text[] not null default '{}',
  equipment text not null default 'none',
  default_reps int,
  default_duration_seconds int,
  met_value numeric not null default 6,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists exercises_phase_idx on public.exercises (phase);
create index if not exists exercises_body_part_idx on public.exercises (body_part);
create index if not exists exercises_active_idx on public.exercises (is_active);

-- ── workout_sessions (per-user history; exercises stored as a jsonb summary) ───
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  device_id text,
  phase text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds int,
  total_reps int not null default 0,
  rounds_completed int not null default 0,
  calories_estimate numeric,
  status text not null default 'completed',
  exercises jsonb not null default '[]'::jsonb
);
create index if not exists workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);

-- ── auto-create a profile row on signup ───────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_sessions enable row level security;

-- profiles: a user can read / insert / update only their own row.
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- exercises: anyone (incl. anonymous) may read active rows; writes are
-- restricted to the service role (used by the seed), which bypasses RLS.
drop policy if exists "exercises public read" on public.exercises;
create policy "exercises public read" on public.exercises for select using (is_active = true);

-- workout_sessions: a user has full control over only their own sessions.
drop policy if exists "sessions owner" on public.workout_sessions;
create policy "sessions owner" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
