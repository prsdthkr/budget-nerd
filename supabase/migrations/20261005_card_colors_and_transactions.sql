-- Run this migration in Supabase SQL Editor for an existing project.
-- It is safe to run more than once.

alter table public.credit_cards
  add column if not exists color text not null default '#2563eb';

create table if not exists public.card_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  type text not null check (type in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit')),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  transaction_date date not null default current_date,
  amount numeric(12, 2) not null check (amount >= 0),
  statement_month date not null check (statement_month = date_trunc('month', statement_month)::date),
  created_at timestamptz not null default now()
);

create index if not exists card_transactions_user_date_idx
  on public.card_transactions (user_id, transaction_date desc, created_at desc);
create index if not exists card_transactions_card_date_idx
  on public.card_transactions (card_id, transaction_date desc, created_at desc);

alter table public.credit_cards enable row level security;
alter table public.card_transactions enable row level security;

grant select, insert, update, delete on public.credit_cards to authenticated;
grant select, insert, update, delete on public.card_transactions to authenticated;

drop policy if exists "Users can read their own card transactions" on public.card_transactions;
create policy "Users can read their own card transactions"
  on public.card_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own card transactions" on public.card_transactions;
create policy "Users can add their own card transactions"
  on public.card_transactions for insert to authenticated
  with check ((select auth.uid()) = user_id and exists (select 1 from public.credit_cards where id = card_id and user_id = (select auth.uid())));

drop policy if exists "Users can update their own card transactions" on public.card_transactions;
create policy "Users can update their own card transactions"
  on public.card_transactions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and exists (select 1 from public.credit_cards where id = card_id and user_id = (select auth.uid())));

drop policy if exists "Users can delete their own card transactions" on public.card_transactions;
create policy "Users can delete their own card transactions"
  on public.card_transactions for delete to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
