-- Add Rent, Supplies, and Utilities transaction categories.
alter table public.card_transactions drop constraint if exists card_transactions_type_check;
alter table public.card_transactions add constraint card_transactions_type_check check (type in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback', 'car', 'rent', 'supplies', 'utilities'));

alter table public.credit_cards drop constraint if exists credit_cards_default_category_check;
alter table public.credit_cards add constraint credit_cards_default_category_check check (default_category in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback', 'car', 'rent', 'supplies', 'utilities'));

alter table public.category_limits drop constraint if exists category_limits_category_check;
alter table public.category_limits add constraint category_limits_category_check check (category in ('subscription', 'grocery', 'shopping', 'misc', 'travel', 'food', 'remit', 'cashback', 'car', 'rent', 'supplies', 'utilities'));

notify pgrst, 'reload schema';
