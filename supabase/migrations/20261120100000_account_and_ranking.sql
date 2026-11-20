-- Account deletion + weekly ball-game ranking.

-- ---------- delete my account ----------
-- Removes the caller's auth user; profiles, game_saves and ball_scores go with it (on delete cascade).
create function public.delete_my_account()
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

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- weekly ball ranking ----------
-- One row per player per week (Monday, Korea time) holding their best score.
create table public.ball_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  score integer not null check (score between 0 and 20000),
  updated_at timestamptz not null default now(),
  primary key (user_id, week)
);

create index ball_scores_week_score_idx on public.ball_scores (week, score desc);

comment on table public.ball_scores is 'Best ball-game score per player per week (KST). Written only through submit_ball_score().';

alter table public.ball_scores enable row level security;

-- players may read their own rows; the public ranking is served by get_ball_ranking()
create policy "ball_scores: read own"
  on public.ball_scores for select to authenticated
  using ((select auth.uid()) = user_id);

create function public.current_ball_week()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', now() at time zone 'Asia/Seoul')::date;
$$;

-- Records a finished round (keeps the best of the week) and returns the caller's rank this week.
create function public.submit_ball_score(p_score integer)
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

revoke execute on function public.submit_ball_score(integer) from public, anon;
grant execute on function public.submit_ball_score(integer) to authenticated;

-- Top players this week with nicknames only (no user ids), plus whether the row is the caller.
create function public.get_ball_ranking(p_limit integer default 10)
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

revoke execute on function public.get_ball_ranking(integer) from public, anon;
grant execute on function public.get_ball_ranking(integer) to authenticated;

revoke execute on function public.current_ball_week() from public, anon;
grant execute on function public.current_ball_week() to authenticated;
