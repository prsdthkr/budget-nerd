-- Add an optional statement day-of-month to each credit card.
alter table public.credit_cards
  add column if not exists statement_day smallint null;

alter table public.credit_cards
  drop constraint if exists credit_cards_statement_day_check;

alter table public.credit_cards
  add constraint credit_cards_statement_day_check
  check (statement_day is null or statement_day between 1 and 31);

notify pgrst, 'reload schema';
