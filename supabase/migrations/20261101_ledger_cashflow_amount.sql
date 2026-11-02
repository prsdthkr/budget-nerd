alter table public.account_ledger_items
  add column if not exists cashflow_amount numeric(12, 2);
