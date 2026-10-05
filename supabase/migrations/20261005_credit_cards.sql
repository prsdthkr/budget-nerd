-- Run this migration in Supabase SQL Editor for an existing project.
-- It is safe to run more than once.

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists credit_cards_user_sort_idx
  on public.credit_cards (user_id, sort_order, created_at);

alter table public.credit_cards enable row level security;

grant select, insert, update, delete on public.credit_cards to authenticated;

drop policy if exists "Users can read their own credit cards" on public.credit_cards;
create policy "Users can read their own credit cards"
  on public.credit_cards for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own credit cards" on public.credit_cards;
create policy "Users can add their own credit cards"
  on public.credit_cards for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own credit cards" on public.credit_cards;
create policy "Users can update their own credit cards"
  on public.credit_cards for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own credit cards" on public.credit_cards;
create policy "Users can delete their own credit cards"
  on public.credit_cards for delete to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
