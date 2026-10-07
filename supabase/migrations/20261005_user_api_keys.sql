-- User-managed API keys for transaction ingestion.
create table if not exists public.user_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_api_keys_user_idx on public.user_api_keys (user_id, created_at desc);
alter table public.user_api_keys enable row level security;
grant select, update on public.user_api_keys to authenticated;

drop policy if exists "Users can read their own API keys" on public.user_api_keys;
create policy "Users can read their own API keys" on public.user_api_keys for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can revoke their own API keys" on public.user_api_keys;
create policy "Users can revoke their own API keys" on public.user_api_keys for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
