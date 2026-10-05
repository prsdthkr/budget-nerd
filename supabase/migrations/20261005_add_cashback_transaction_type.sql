-- Add cashback as a supported transaction category.
alter table public.card_transactions
  drop constraint if exists card_transactions_type_check;

alter table public.card_transactions
  add constraint card_transactions_type_check
  check (type in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback'));

notify pgrst, 'reload schema';
