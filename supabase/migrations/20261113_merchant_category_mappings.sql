-- Per-user merchant-name to transaction-category mappings.
create table if not exists public.merchant_category_mappings (
  user_id uuid not null references auth.users(id) on delete cascade,
  merchant_key text not null check (merchant_key = lower(btrim(merchant_key)) and char_length(merchant_key) between 1 and 120),
  category text not null check (category ~ '^[a-z0-9_-]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);

create index if not exists merchant_category_mappings_user_idx on public.merchant_category_mappings (user_id, merchant_key);
alter table public.merchant_category_mappings enable row level security;
grant select, insert, update, delete on public.merchant_category_mappings to authenticated;

drop policy if exists "Users can manage their own merchant mappings" on public.merchant_category_mappings;
create policy "Users can manage their own merchant mappings" on public.merchant_category_mappings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
