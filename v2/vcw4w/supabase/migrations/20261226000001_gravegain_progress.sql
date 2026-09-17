create table if not exists public.gravegain_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('lore','mission')),
  item_id text not null check (length(item_id) between 1 and 100),
  count integer not null default 0 check (count >= 0),
  first_collected_at timestamptz not null default now(),
  last_collected_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);
alter table public.gravegain_progress enable row level security;
drop policy if exists "players read own gravegain progress" on public.gravegain_progress;
create policy "players read own gravegain progress" on public.gravegain_progress for select using (auth.uid() = user_id);
create or replace function public.collect_gravegain_progress(p_kind text, p_item_id text)
returns integer language plpgsql security definer set search_path = '' as $$
declare result_count integer;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if p_kind not in ('lore','mission') or length(p_item_id) not between 1 and 100 then raise exception 'invalid progress item'; end if;
  insert into public.gravegain_progress(user_id, kind, item_id, count)
  values (auth.uid(), p_kind, p_item_id, 1)
  on conflict (user_id, kind, item_id) do update set count = public.gravegain_progress.count + 1, last_collected_at = now()
  returning count into result_count;
  return result_count;
end $$;
revoke all on function public.collect_gravegain_progress(text,text) from public;
grant execute on function public.collect_gravegain_progress(text,text) to authenticated;
