# Supabase Setup for AtomicStreak

## 1. Create a Supabase project
- Create a new Supabase project.
- In `Authentication -> Providers`, enable **Anonymous Sign-Ins**.

## 2. Run this SQL in SQL Editor
```sql
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  identity text,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  done_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, habit_id, done_on)
);

alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

create policy "Users can read own habits"
on public.habits
for select
using (auth.uid() = user_id);

create policy "Users can insert own habits"
on public.habits
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own habits"
on public.habits
for delete
using (auth.uid() = user_id);

create policy "Users can read own checkins"
on public.habit_checkins
for select
using (auth.uid() = user_id);

create policy "Users can insert own checkins"
on public.habit_checkins
for insert
with check (auth.uid() = user_id);

create policy "Users can update own checkins"
on public.habit_checkins
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own checkins"
on public.habit_checkins
for delete
using (auth.uid() = user_id);
```

## 3. Add project credentials
1. Copy config template:
   ```bash
   cp supabase-config.example.js supabase-config.local.js
   ```
2. Edit `supabase-config.local.js`:
   - `url`: `https://<project-ref>.supabase.co`
   - `anonKey`: your Supabase anon key

## 4. Run the app
Open `index.html` in your browser.

If setup is correct, status should show:
`Connected. Data is now stored in Supabase.`
