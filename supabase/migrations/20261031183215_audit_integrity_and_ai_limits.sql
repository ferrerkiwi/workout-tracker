-- Preserve the unit in which each workout was actually recorded. Older sessions
-- without a snapshot use the profile unit at migration time (earlier switches
-- cannot be reconstructed from the legacy schema).
alter table public.workout_sessions add column unit text;
update public.workout_sessions s set unit = coalesce(
  (select e.unit from public.workout_exercises e where e.session_id=s.id order by e.order_index limit 1),
  (select p.unit_preference from public.profiles p where p.id=s.user_id), 'lbs');
alter table public.workout_sessions alter column unit set not null;
alter table public.workout_sessions add constraint workout_sessions_unit_check check (unit in ('lbs','kg'));

create function public.set_workout_unit() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  select unit_preference into new.unit from public.profiles where id=new.user_id;
  new.unit := coalesce(new.unit,'lbs');
  return new;
end; $$;
create trigger set_workout_unit before insert on public.workout_sessions
for each row execute function public.set_workout_unit();
revoke all on function public.set_workout_unit() from public,anon,authenticated;

-- A profile update and all active plan conversions commit or roll back together.
create function public.convert_plan_units() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if new.unit_preference is distinct from old.unit_preference then
    update public.routine_exercises e set target_weight = round(
      case when new.unit_preference='kg' then e.target_weight / 2.2046226218
      else e.target_weight * 2.2046226218 end, 2)
    from public.routine_days d join public.routines r on r.id=d.routine_id
    where e.routine_day_id=d.id and r.user_id=new.id and r.is_active and e.target_weight is not null;
  end if;
  return new;
end; $$;
create trigger convert_plan_units after update of unit_preference on public.profiles
for each row execute function public.convert_plan_units();
revoke all on function public.convert_plan_units() from public,anon,authenticated;

alter table public.routine_exercises add constraint routine_exercises_weight_range_ck
  check (target_weight is null or (target_weight between 0 and 5000 and target_weight::text <> 'NaN'));
alter table public.routine_exercises add constraint routine_exercises_targets_range_ck
  check (target_sets between 1 and 20 and target_reps between 1 and 100);
alter table public.routine_exercises add constraint routine_exercises_name_length_ck
  check (length(btrim(exercise_name)) between 1 and 120);

create or replace function public.prepare_workout_exercises(p_session_id uuid)
returns jsonb
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_session public.workout_sessions%rowtype;
  v_unit text;
begin
  select * into v_session from public.workout_sessions
    where id = p_session_id and user_id = auth.uid() for update;
  if not found or v_session.completed_at is not null then
    raise exception 'That workout is not open.';
  end if;
  select unit_preference into v_unit from public.profiles where id = auth.uid();
  -- A session with saved results keeps one original unit. Entirely unstarted
  -- sessions can follow a changed preference when reopened.
  if not exists (select 1 from public.session_sets where session_id=p_session_id and completed) then
    update public.workout_sessions set unit=v_unit where id=p_session_id;
    v_session.unit := v_unit;
  end if;
  if not exists (select 1 from public.workout_exercises where session_id = p_session_id) then
    insert into public.workout_exercises (
      session_id, routine_exercise_id, exercise_name, order_index, metric,
      target_sets, target_reps, target_seconds, target_weight, rest_seconds, notes, unit
    )
    select p_session_id, e.id, e.exercise_name, e.order_index, e.metric,
      e.target_sets, e.target_reps, e.target_seconds, e.target_weight,
      e.rest_seconds, e.notes, v_session.unit
    from public.routine_exercises e
    where e.routine_day_id = v_session.routine_day_id;
  end if;
  -- Refresh targets only on exercises with no completed sets. Keep order indexes
  -- stable: they are part of the saved-set identity, even after plan reordering.
  update public.workout_exercises w set
    exercise_name=e.exercise_name, metric=e.metric, target_sets=e.target_sets,
    target_reps=e.target_reps, target_seconds=e.target_seconds,
    target_weight=case when v_unit=v_session.unit then e.target_weight
      when v_session.unit='kg' then round(e.target_weight / 2.2046226218,2)
      else round(e.target_weight * 2.2046226218,2) end,
    rest_seconds=e.rest_seconds, notes=e.notes, unit=v_session.unit,
    movement_type=null
  from public.routine_exercises e
  where w.session_id=p_session_id and e.id=w.routine_exercise_id
    and not exists (select 1 from public.session_sets ss where ss.session_id=w.session_id
      and ss.order_index=w.order_index and ss.completed);
  return coalesce((select jsonb_agg(to_jsonb(e) order by e.order_index)
    from public.workout_exercises e where e.session_id = p_session_id), '[]'::jsonb);
end;
$$;

create or replace function public.complete_workout_set(
  p_workout_exercise_id uuid, p_set_index integer,
  p_reps integer, p_seconds integer, p_weight numeric, p_movement_type text
)
returns jsonb
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_exercise public.workout_exercises%rowtype;
  v_session public.workout_sessions%rowtype;
  v_count integer;
  v_min_weight numeric;
  v_increment numeric;
  v_next numeric;
begin
  select * into v_exercise from public.workout_exercises where id = p_workout_exercise_id;
  if not found then raise exception 'Exercise not found.'; end if;
  select * into v_session from public.workout_sessions
    where id = v_exercise.session_id and user_id = auth.uid() for update;
  if not found or v_session.completed_at is not null then
    raise exception 'That workout is not open.';
  end if;
  -- The session lock serializes all saves, including concurrent retries.
  select * into v_exercise from public.workout_exercises where id = p_workout_exercise_id for update;
  if p_set_index is null or p_set_index < 0 or p_set_index >= v_exercise.target_sets then
    raise exception 'Invalid set number.';
  end if;
  if (v_exercise.metric = 'reps' and (p_reps is null or p_reps < 0 or p_reps > 1000 or p_seconds is not null))
    or (v_exercise.metric = 'time' and (p_seconds is null or p_seconds < 0 or p_seconds > 3600 or p_reps is not null))
    or (p_weight is not null and (p_weight < 0 or p_weight > 5000 or p_weight::text = 'NaN')) then
    raise exception 'Invalid set result.';
  end if;
  if p_movement_type is not null and p_movement_type not in ('compound', 'isolation') then
    raise exception 'Choose compound or isolation.';
  end if;
  if v_exercise.metric = 'reps' and p_weight > 0 and p_movement_type is null then
    raise exception 'Choose an exercise type before saving a weighted set.';
  end if;
  -- Completed sets are immutable in this flow; identical retries are harmless.
  if exists (select 1 from public.session_sets s
    where s.session_id = v_exercise.session_id and s.exercise_name = v_exercise.exercise_name
      and s.order_index = v_exercise.order_index and s.set_index = p_set_index and s.completed) then
    if not exists (select 1 from public.session_sets s
      where s.session_id = v_exercise.session_id and s.exercise_name = v_exercise.exercise_name
        and s.order_index = v_exercise.order_index and s.set_index = p_set_index and s.completed
        and s.reps is not distinct from p_reps and s.seconds is not distinct from p_seconds
        and s.weight is not distinct from p_weight) then
      raise exception 'That set is already saved. Refresh the workout to continue.';
    end if;
    return jsonb_build_object('nextWeight', v_exercise.next_weight);
  end if;

  insert into public.session_sets (session_id, exercise_name, order_index, set_index, reps, seconds, weight, completed)
  values (v_exercise.session_id, v_exercise.exercise_name, v_exercise.order_index, p_set_index, p_reps, p_seconds, p_weight, true)
  on conflict (session_id, exercise_name, order_index, set_index) do update
    set reps = excluded.reps, seconds = excluded.seconds, weight = excluded.weight, completed = true;
  update public.workout_exercises set movement_type = p_movement_type where id = v_exercise.id;

  if v_exercise.metric = 'reps' and v_exercise.progressed_at is null and p_movement_type is not null then
    select count(*), min(s.weight) into v_count, v_min_weight
    from public.session_sets s where s.session_id = v_exercise.session_id
      and s.exercise_name = v_exercise.exercise_name and s.order_index = v_exercise.order_index
      and s.set_index >= 0 and s.set_index < v_exercise.target_sets and s.completed
      and s.reps >= v_exercise.target_reps and s.seconds is null
      and s.weight > 0;
    if v_count = v_exercise.target_sets then
      v_increment := case when p_movement_type = 'compound' then 10 else 5 end;
      if v_exercise.unit = 'kg' then v_increment := round(v_increment / 2.2046226218, 2); end if;
      v_next := round(coalesce(v_exercise.target_weight, v_min_weight) + v_increment, 2);
      -- Do not overwrite a plan edited or regenerated during the workout.
      update public.routine_exercises e set target_weight = v_next
      from public.routine_days d join public.routines r on r.id = d.routine_id
      where e.id = v_exercise.routine_exercise_id and e.routine_day_id = d.id
        and r.user_id = auth.uid() and r.is_active
        and v_exercise.unit = (select unit_preference from public.profiles where id=auth.uid())
        and e.exercise_name = v_exercise.exercise_name and e.metric = v_exercise.metric
        and e.target_sets = v_exercise.target_sets and e.target_reps = v_exercise.target_reps
        and e.target_weight is not distinct from v_exercise.target_weight
        and v_next <= 5000;
      if found then
        update public.workout_exercises set next_weight = v_next, progressed_at = now()
          where id = v_exercise.id;
        return jsonb_build_object('nextWeight', v_next);
      end if;
    end if;
  end if;
  return jsonb_build_object('nextWeight', null);
end;
$$;

-- Private, append-only usage records cannot be erased through the Data API.
create schema if not exists app_private;
revoke all on schema app_private from public,anon;
grant usage on schema app_private to authenticated;
create table app_private.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  feature text not null check (feature in ('coach','generation')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '3 minutes',
  finished boolean not null default false,
  response jsonb,
  unique(user_id,request_id)
);
create index ai_requests_user_created_idx on app_private.ai_requests(user_id,created_at);
alter table app_private.ai_requests enable row level security;
revoke all on app_private.ai_requests from public,anon,authenticated;

create function app_private.acquire_ai_request(p_feature text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_previous app_private.ai_requests%rowtype;
  v_id uuid;
  v_limit integer;
begin
  if v_user is null then raise exception 'Not signed in.' using errcode='28000'; end if;
  if p_feature not in ('coach','generation') or p_feature is null or p_request_id is null then
    raise exception 'Invalid AI request.' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
  select * into v_previous from app_private.ai_requests where user_id=v_user and request_id=p_request_id;
  if found then
    if v_previous.feature <> p_feature then raise exception 'Invalid AI request.' using errcode='22023'; end if;
    if v_previous.response is not null then
      return jsonb_build_object('cached',v_previous.response);
    end if;
    if v_previous.expires_at < now() then
      -- Never rerun an interrupted request: it could have saved edits before
      -- the connection failed. A fresh request requires an explicit user action.
      return jsonb_build_object('cached',jsonb_build_object('error','This request was interrupted. Review your plan before sending a new request.',
        'routineChanged',p_feature='coach'));
    end if;
    raise exception 'That request is still running. Please wait.' using errcode='P0001';
  end if;
  if exists(select 1 from app_private.ai_requests where user_id=v_user and not finished and expires_at>now()) then
    raise exception 'An AI request is already running. Please wait.' using errcode='P0001';
  end if;
  if (select count(*) from app_private.ai_requests where user_id=v_user and created_at>now()-interval '1 minute') >= 6 then
    raise exception 'Too many requests. Please wait a minute.' using errcode='P0001';
  end if;
  if p_feature='generation' and coalesce(auth.jwt()->>'is_anonymous','false')='true' then
    raise exception 'Demo generation is unavailable.' using errcode='42501';
  end if;
  v_limit := case when p_feature='generation' then 5
    when coalesce(auth.jwt()->>'is_anonymous','false')='true' then 3 else 30 end;
  if (select count(*) from app_private.ai_requests where user_id=v_user and feature=p_feature
      and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= v_limit then
    raise exception 'Daily AI limit reached. Please try again tomorrow.' using errcode='P0001';
  end if;
  insert into app_private.ai_requests(user_id,request_id,feature) values(v_user,p_request_id,p_feature) returning id into v_id;
  return jsonb_build_object('leaseId',v_id);
end; $$;

create function app_private.record_ai_response(p_lease_id uuid,p_response jsonb,p_finished boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Not signed in.' using errcode='28000'; end if;
  update app_private.ai_requests set response=p_response, finished=p_finished
  where id=p_lease_id and user_id=auth.uid() and not finished;
end; $$;

create function public.acquire_ai_request(p_feature text,p_request_id uuid) returns jsonb
language sql security invoker set search_path=public,pg_temp as $$
  select app_private.acquire_ai_request(p_feature,p_request_id);
$$;
create function public.record_ai_response(p_lease_id uuid,p_response jsonb,p_finished boolean default true) returns void
language sql security invoker set search_path=public,pg_temp as $$
  select app_private.record_ai_response(p_lease_id,p_response,p_finished);
$$;
revoke all on function app_private.acquire_ai_request(text,uuid), app_private.record_ai_response(uuid,jsonb,boolean),
  public.acquire_ai_request(text,uuid), public.record_ai_response(uuid,jsonb,boolean) from public,anon;
grant execute on function app_private.acquire_ai_request(text,uuid), app_private.record_ai_response(uuid,jsonb,boolean),
  public.acquire_ai_request(text,uuid), public.record_ai_response(uuid,jsonb,boolean) to authenticated;

-- Return one date per day so the Data API row limit cannot truncate a long
-- streak when a user has logged multiple sessions per day.
create function public.get_completed_workout_dates(p_from date)
returns table(performed_on date)
language sql stable security invoker set search_path=public,pg_temp as $$
  select distinct s.performed_on from public.workout_sessions s
  where s.user_id=auth.uid() and s.completed_at is not null and s.performed_on>=p_from
  order by s.performed_on;
$$;
revoke all on function public.get_completed_workout_dates(date) from public,anon;
grant execute on function public.get_completed_workout_dates(date) to authenticated;
