-- Add cashflow month assignment to transactions and ledger entries.
alter table public.card_transactions
  add column if not exists cashflow_month date;

update public.card_transactions
set cashflow_month = date_trunc('month', current_date)::date
where cashflow_month is null;

alter table public.card_transactions
  alter column cashflow_month set default date_trunc('month', current_date)::date,
  alter column cashflow_month set not null;

alter table public.card_transactions
  drop constraint if exists card_transactions_cashflow_month_check;
alter table public.card_transactions
  add constraint card_transactions_cashflow_month_check
  check (cashflow_month = date_trunc('month', cashflow_month)::date);

alter table public.account_ledger_items
  add column if not exists cashflow_month date;

alter table public.account_ledger_items
  drop constraint if exists account_ledger_items_cashflow_month_check;
alter table public.account_ledger_items
  add constraint account_ledger_items_cashflow_month_check
  check (cashflow_month is null or cashflow_month = date_trunc('month', cashflow_month)::date);

notify pgrst, 'reload schema';
