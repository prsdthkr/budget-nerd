-- Allow transactions to be removed from a cashflow month after creation.
alter table public.card_transactions alter column cashflow_month drop not null;
notify pgrst, 'reload schema';
