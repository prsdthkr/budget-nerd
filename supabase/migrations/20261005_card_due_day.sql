-- Add an optional credit-card due day-of-month.
alter table public.credit_cards
  add column if not exists due_day smallint null;

alter table public.credit_cards
  drop constraint if exists credit_cards_due_day_check;

alter table public.credit_cards
  add constraint credit_cards_due_day_check
  check (due_day is null or due_day between 1 and 31);

notify pgrst, 'reload schema';
