-- Server-side sanity checks for cloud saves.
-- The game runs on the client, so this cannot stop every cheat, but it rejects states no real play can reach
-- (edited coins, impossible levels, stats outside 0–100) before they are stored.
-- Limits are far above anything normal play produces.

create function private.game_state_problem(p_state jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
begin
  if jsonb_typeof(p_state) <> 'object' then
    return 'state';
  end if;

  -- counters must be numbers when present (missing keys are filled in by the client)
  foreach k in array array['coins', 'hearts', 'level', 'exp', 'affection', 'bestBall'] loop
    if p_state ? k and jsonb_typeof(p_state -> k) <> 'number' then
      return k;
    end if;
  end loop;

  if (p_state ->> 'coins')::numeric not between 0 and 10000000 then return 'coins'; end if;
  if (p_state ->> 'hearts')::numeric not between 0 and 1000000 then return 'hearts'; end if;
  if (p_state ->> 'level')::numeric not between 1 and 999 then return 'level'; end if;
  if (p_state ->> 'exp')::numeric not between 0 and 999 * 300 then return 'exp'; end if;
  if (p_state ->> 'affection')::numeric not between 0 and 100 then return 'affection'; end if;
  if (p_state ->> 'bestBall')::numeric not between 0 and 20000 then return 'bestBall'; end if;

  if p_state ? 'stats' then
    if jsonb_typeof(p_state -> 'stats') <> 'object' then
      return 'stats';
    end if;
    for k in select jsonb_object_keys(p_state -> 'stats') loop
      if jsonb_typeof(p_state -> 'stats' -> k) <> 'number'
         or (p_state -> 'stats' ->> k)::numeric not between 0 and 100 then
        return 'stats.' || k;
      end if;
    end loop;
  end if;

  return null;
end;
$$;

revoke execute on function private.game_state_problem(jsonb) from public, anon;
grant execute on function private.game_state_problem(jsonb) to authenticated;

-- same signature and behavior as before, plus the check
create or replace function public.save_game(p_state jsonb, p_base_revision bigint, p_schema_version smallint default 1)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_rev bigint;
  v_problem text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  v_problem := private.game_state_problem(p_state);
  if v_problem is not null then
    raise exception 'invalid_state:%', v_problem using errcode = '22023';
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

-- direct table writes bypass save_game(): route them through the same check
alter table public.game_saves
  add constraint game_saves_state_valid check (private.game_state_problem(state) is null);
