-- Add optional cached card artwork URL.
alter table public.credit_cards
  add column if not exists image_url text;
notify pgrst, 'reload schema';
