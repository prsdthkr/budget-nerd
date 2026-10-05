-- Add a default transaction category to each credit card.
alter table public.credit_cards
  add column if not exists default_category text not null default 'misc';

alter table public.credit_cards
  drop constraint if exists credit_cards_default_category_check;

alter table public.credit_cards
  add constraint credit_cards_default_category_check
  check (default_category in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback'));

notify pgrst, 'reload schema';
