-- 양말이의 하루: profiles + cloud game saves
-- Every row belongs to one auth user; RLS limits each user to their own rows.

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null default '보호자'
    check (char_length(nickname) between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Player profile (owner nickname). One row per auth user, created by trigger.';

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- create a profile for every new user (guests included)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- game saves ----------
create table public.game_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  schema_version smallint not null default 1,
  revision bigint not null default 1,
  updated_at timestamptz not null default now(),
  constraint game_saves_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint game_saves_state_size check (pg_column_size(state) < 65536)
);

comment on table public.game_saves is 'Latest game state per user. revision increases on every save (optimistic concurrency).';

alter table public.game_saves enable row level security;

create policy "game_saves: read own"
  on public.game_saves for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "game_saves: insert own"
  on public.game_saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "game_saves: update own"
  on public.game_saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- keep updated_at current on direct updates too
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger game_saves_touch before update on public.game_saves
  for each row execute function public.touch_updated_at();

-- Save with optimistic concurrency.
-- p_base_revision = the revision the client last saw (0 when it has never saved).
-- Returns the new revision, or raises 'revision_conflict' when another device saved in between.
create function public.save_game(p_state jsonb, p_base_revision bigint, p_schema_version smallint default 1)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rev bigint;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.game_saves as g (user_id, state, schema_version, revision)
  values (v_uid, p_state, p_schema_version, 1)
  on conflict (user_id) do update
    set state = excluded.state,
        schema_version = excluded.schema_version,
        revision = g.revision + 1
    where g.revision = p_base_revision
  returning g.revision into v_rev;

  if v_rev is null then
    raise exception 'revision_conflict' using errcode = 'P0001';
  end if;

  return v_rev;
end;
$$;

revoke execute on function public.save_game(jsonb, bigint, smallint) from public, anon;
grant execute on function public.save_game(jsonb, bigint, smallint) to authenticated;

-- trigger helpers are not meant to be called over the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
