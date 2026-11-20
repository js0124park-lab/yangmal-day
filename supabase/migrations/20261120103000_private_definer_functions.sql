-- Move SECURITY DEFINER bodies out of the API-exposed `public` schema (Supabase lint 0029).
-- `public` keeps thin SECURITY INVOKER wrappers with the same names and signatures, so clients do not change.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- ---------- delete my account ----------
create function private.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- ---------- ball ranking ----------
create function private.submit_ball_score(p_score integer)
returns table (best integer, rank bigint, players bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := public.current_ball_week();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_score is null or p_score < 0 or p_score > 20000 then
    raise exception 'invalid_score' using errcode = '22023';
  end if;

  insert into public.ball_scores as s (user_id, week, score)
  values (v_uid, v_week, p_score)
  on conflict (user_id, week) do update
    set score = greatest(s.score, excluded.score),
        updated_at = case when excluded.score > s.score then now() else s.updated_at end;

  return query
    select me.score,
           (select count(*) + 1 from public.ball_scores o where o.week = v_week and o.score > me.score),
           (select count(*) from public.ball_scores o where o.week = v_week)
    from public.ball_scores me
    where me.user_id = v_uid and me.week = v_week;
end;
$$;

create function private.get_ball_ranking(p_limit integer)
returns table (rank bigint, nickname text, score integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select rank() over (order by s.score desc) as rank,
         coalesce(p.nickname, '보호자') as nickname,
         s.score,
         s.user_id = (select auth.uid()) as is_me
  from public.ball_scores s
  left join public.profiles p on p.id = s.user_id
  where s.week = public.current_ball_week()
  order by s.score desc, s.updated_at asc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.delete_my_account() to authenticated;
grant execute on function private.submit_ball_score(integer) to authenticated;
grant execute on function private.get_ball_ranking(integer) to authenticated;

-- ---------- public wrappers (invoker) ----------
create or replace function public.delete_my_account()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.delete_my_account();
$$;

create or replace function public.submit_ball_score(p_score integer)
returns table (best integer, rank bigint, players bigint)
language sql
security invoker
set search_path = ''
as $$
  select * from private.submit_ball_score(p_score);
$$;

create or replace function public.get_ball_ranking(p_limit integer default 10)
returns table (rank bigint, nickname text, score integer, is_me boolean)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.get_ball_ranking(p_limit);
$$;

revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.submit_ball_score(integer) from public, anon;
revoke execute on function public.get_ball_ranking(integer) from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.submit_ball_score(integer) to authenticated;
grant execute on function public.get_ball_ranking(integer) to authenticated;
