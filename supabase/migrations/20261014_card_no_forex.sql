-- Add a no-foreign-exchange-fee flag to credit cards.
alter table public.credit_cards
  add column if not exists no_forex boolean not null default false;
notify pgrst, 'reload schema';
