-- Add configurable categories to ledger items.
alter table public.account_ledger_items
  add column if not exists category text not null default 'misc';
notify pgrst, 'reload schema';
