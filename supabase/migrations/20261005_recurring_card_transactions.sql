-- Add recurring support for card transactions.
alter table public.card_transactions
  add column if not exists recurring boolean not null default false;
alter table public.card_transactions
  add column if not exists recurrence_id uuid default gen_random_uuid();

update public.card_transactions
set recurrence_id = gen_random_uuid()
where recurrence_id is null;

alter table public.card_transactions
  alter column recurrence_id set not null;

create unique index if not exists card_transactions_recurrence_unique_idx
  on public.card_transactions (card_id, recurrence_id, statement_month);

notify pgrst, 'reload schema';
