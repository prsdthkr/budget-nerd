-- Make Spend category tracking and limits configurable per user.
alter table public.category_limits
  add column if not exists is_tracked boolean not null default false;

alter table public.category_limits
  alter column limit_amount drop not null,
  alter column limit_amount drop default;

update public.category_limits
set is_tracked = category in ('grocery', 'shopping', 'food', 'misc')
where is_tracked = false;

notify pgrst, 'reload schema';
