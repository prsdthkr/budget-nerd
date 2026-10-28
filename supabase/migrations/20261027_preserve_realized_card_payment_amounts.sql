-- Do not restore a planned amount when a realized card payment's transaction changes.
-- The old-row branch already preserves realized payments; the new-row branch must
-- apply the same rule when an UPDATE fires the trigger.

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
      where source_type = 'card_payment' and card_id = target_card_id and statement_month = target_statement_month
        and not (realized_amount <> 0 and planned_amount = 0);
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
      where source_type = 'card_payment' and card_id = target_card_id and statement_month = target_statement_month
        and not (realized_amount <> 0 and planned_amount = 0);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

notify pgrst, 'reload schema';
