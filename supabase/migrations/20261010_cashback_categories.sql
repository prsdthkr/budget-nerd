-- Add user-managed cashback categories, card assignments, and transaction cashback values.

create table if not exists public.cashback_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  emoji text not null default '💰' check (char_length(btrim(emoji)) between 1 and 8),
  percentage numeric(7, 4) not null check (percentage >= 0 and percentage <= 100),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.card_transactions
  add column if not exists cashback_category_id uuid references public.cashback_categories(id) on delete set null,
  add column if not exists cashback_amount numeric(12, 2) not null default 0 check (cashback_amount >= 0);

create table if not exists public.card_cashback_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  cashback_category_id uuid not null references public.cashback_categories(id) on delete cascade,
  starts_on date,
  ends_on date,
  max_cashback numeric(12, 2) check (max_cashback is null or max_cashback >= 0),
  created_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create index if not exists cashback_categories_user_idx on public.cashback_categories(user_id, name);
create index if not exists card_cashback_assignments_card_idx on public.card_cashback_assignments(card_id, starts_on, ends_on);
create index if not exists card_transactions_cashback_category_idx on public.card_transactions(cashback_category_id);

alter table public.cashback_categories enable row level security;
alter table public.card_cashback_assignments enable row level security;

grant select, insert, update, delete on public.cashback_categories to authenticated;
grant select, insert, update, delete on public.card_cashback_assignments to authenticated;

drop policy if exists "Users can manage their own cashback categories" on public.cashback_categories;
create policy "Users can manage their own cashback categories"
  on public.cashback_categories for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own card cashback assignments" on public.card_cashback_assignments;
create policy "Users can manage their own card cashback assignments"
  on public.card_cashback_assignments for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.credit_cards where id = card_id and user_id = (select auth.uid()))
    and exists (select 1 from public.cashback_categories where id = cashback_category_id and user_id = (select auth.uid())));

drop policy if exists "Users can add their own card transactions" on public.card_transactions;
create policy "Users can add their own card transactions"
  on public.card_transactions for insert to authenticated
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.credit_cards where id = card_id and user_id = (select auth.uid()))
    and (cashback_category_id is null or exists (select 1 from public.cashback_categories where id = cashback_category_id and user_id = (select auth.uid()))));

drop policy if exists "Users can update their own card transactions" on public.card_transactions;
create policy "Users can update their own card transactions"
  on public.card_transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
    and exists (select 1 from public.credit_cards where id = card_id and user_id = (select auth.uid()))
    and (cashback_category_id is null or exists (select 1 from public.cashback_categories where id = cashback_category_id and user_id = (select auth.uid()))));

notify pgrst, 'reload schema';
