-- Add a configured minimum balance for bank-account alerts.
alter table public.bank_accounts
  add column if not exists minimum_balance numeric(12, 2) not null default 0;

alter table public.bank_accounts
  drop constraint if exists bank_accounts_minimum_balance_check;

alter table public.bank_accounts
  add constraint bank_accounts_minimum_balance_check
  check (minimum_balance >= 0);

notify pgrst, 'reload schema';
