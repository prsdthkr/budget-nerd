-- Run this migration in Supabase SQL Editor for an existing project.
-- Transaction amounts may be negative for credits such as cashback or refunds.

alter table public.card_transactions
  drop constraint if exists card_transactions_amount_check;

notify pgrst, 'reload schema';
