-- Add user-scoped monthly category spend limits.
create table if not exists public.category_limits (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback', 'car')),
  limit_amount numeric(12, 2) not null default 1000 check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.category_limits enable row level security;
grant select, insert, update, delete on public.category_limits to authenticated;

drop policy if exists "Users can read their own category limits" on public.category_limits;
create policy "Users can read their own category limits" on public.category_limits for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can manage their own category limits" on public.category_limits;
create policy "Users can manage their own category limits" on public.category_limits for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
