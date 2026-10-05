-- Link planned card payments to a card statement and keep their planned amount synchronized.
alter table public.account_ledger_items
  add column if not exists source_type text not null default 'manual';
alter table public.account_ledger_items
  add column if not exists card_id uuid references public.credit_cards(id) on delete cascade;
alter table public.account_ledger_items
  add column if not exists statement_month date;

alter table public.account_ledger_items
  drop constraint if exists account_ledger_items_source_type_check;
alter table public.account_ledger_items
  add constraint account_ledger_items_source_type_check
  check (source_type in ('manual', 'card_payment'));

alter table public.account_ledger_items
  drop constraint if exists account_ledger_items_statement_month_check;
alter table public.account_ledger_items
  add constraint account_ledger_items_statement_month_check
  check (statement_month is null or statement_month = date_trunc('month', statement_month)::date);

create unique index if not exists account_ledger_card_payment_unique_idx
  on public.account_ledger_items (card_id, statement_month)
  where source_type = 'card_payment';

create or replace function public.sync_card_payment_planned_amount()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_card_id uuid;
  target_statement_month date;
  statement_total numeric;
begin
  if (TG_OP = 'DELETE' or TG_OP = 'UPDATE') then
    target_card_id := old.card_id;
    target_statement_month := old.statement_month;
    if target_card_id is not null and target_statement_month is not null then
      select coalesce(sum(amount), 0) into statement_total
      from public.card_transactions
      where card_id = target_card_id and statement_month = target_statement_month;
      update public.account_ledger_items
      set planned_amount = -statement_total
      where source_type = 'card_payment' and card_id = target_card_id and statement_month = target_statement_month;
    end if;
  end if;
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    target_card_id := new.card_id;
    target_statement_month := new.statement_month;
    if target_card_id is not null and target_statement_month is not null then
      select coalesce(sum(amount), 0) into statement_total
      from public.card_transactions
      where card_id = target_card_id and statement_month = target_statement_month;
      update public.account_ledger_items
      set planned_amount = -statement_total
      where source_type = 'card_payment' and card_id = target_card_id and statement_month = target_statement_month;
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_card_payment_after_transaction_change on public.card_transactions;
create trigger sync_card_payment_after_transaction_change
after insert or update or delete on public.card_transactions
for each row execute procedure public.sync_card_payment_planned_amount();

notify pgrst, 'reload schema';
