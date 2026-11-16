-- Give card payment ledger entries their own category instead of Misc.
update public.account_ledger_items
set category = 'cc_payment'
where source_type = 'card_payment'
  and (category is null or category = 'misc');

notify pgrst, 'reload schema';
