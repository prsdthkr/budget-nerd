-- Add an optional default statement month to each credit card.
alter table public.credit_cards
  add column if not exists default_statement_month date null;

alter table public.credit_cards
  drop constraint if exists credit_cards_default_statement_month_check;

alter table public.credit_cards
  add constraint credit_cards_default_statement_month_check
  check (default_statement_month is null or default_statement_month = date_trunc('month', default_statement_month)::date);

notify pgrst, 'reload schema';
