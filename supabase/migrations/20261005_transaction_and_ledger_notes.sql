-- Add optional notes to transactions and ledger items.
alter table public.card_transactions
  add column if not exists notes text not null default '';
alter table public.account_ledger_items
  add column if not exists notes text not null default '';
notify pgrst, 'reload schema';
