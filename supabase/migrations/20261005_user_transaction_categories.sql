-- Add user-configurable transaction categories.
create table if not exists public.transaction_categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9_-]+$'),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  emoji text not null default '•',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);
alter table public.transaction_categories enable row level security;
grant select, insert, update, delete on public.transaction_categories to authenticated;
drop policy if exists "Users can manage their own transaction categories" on public.transaction_categories;
create policy "Users can manage their own transaction categories" on public.transaction_categories for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table public.card_transactions drop constraint if exists card_transactions_type_check;
alter table public.credit_cards drop constraint if exists credit_cards_default_category_check;
alter table public.category_limits drop constraint if exists category_limits_category_check;

notify pgrst, 'reload schema';
