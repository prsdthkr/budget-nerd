-- Add user-owned bank accounts and planned/realized ledger items.
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  account_number text not null,
  routing_number text not null,
  starting_balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.account_ledger_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete cascade,
  description text not null default '',
  ledger_date date not null default current_date,
  realized_amount numeric(12, 2) not null default 0,
  planned_amount numeric(12, 2) not null default 0,
  recurring boolean not null default false,
  recurrence_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (account_id, recurrence_id, ledger_date)
);

create index if not exists bank_accounts_user_idx on public.bank_accounts (user_id);
create index if not exists account_ledger_user_date_idx on public.account_ledger_items (user_id, ledger_date desc);
create index if not exists account_ledger_account_date_idx on public.account_ledger_items (account_id, ledger_date desc);

alter table public.bank_accounts enable row level security;
alter table public.account_ledger_items enable row level security;
grant select, insert, update, delete on public.bank_accounts to authenticated;
grant select, insert, update, delete on public.account_ledger_items to authenticated;

drop policy if exists "Users can manage their own bank accounts" on public.bank_accounts;
create policy "Users can manage their own bank accounts" on public.bank_accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users can manage their own ledger items" on public.account_ledger_items;
create policy "Users can manage their own ledger items" on public.account_ledger_items for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and exists (select 1 from public.bank_accounts where id = account_id and user_id = (select auth.uid())));

notify pgrst, 'reload schema';
