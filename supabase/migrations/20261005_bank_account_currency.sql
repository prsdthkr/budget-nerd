-- Add configurable currency to bank accounts.
alter table public.bank_accounts
  add column if not exists currency text not null default 'USD';

alter table public.bank_accounts
  drop constraint if exists bank_accounts_currency_check;

alter table public.bank_accounts
  add constraint bank_accounts_currency_check
  check (currency in ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CHF', 'SGD'));

notify pgrst, 'reload schema';
