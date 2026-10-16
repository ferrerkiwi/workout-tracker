-- Freeze workout targets independently of later plan edits. Each exercise also
-- records its earned increase, making completion retries safe across tabs.
create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  routine_exercise_id uuid references public.routine_exercises(id) on delete set null,
  exercise_name text not null,
  order_index integer not null check (order_index between 0 and 99),
  metric text not null check (metric in ('reps', 'time')),
  target_sets integer not null check (target_sets between 1 and 20),
  target_reps integer not null check (target_reps between 1 and 1000),
  target_seconds integer,
  target_weight numeric,
  rest_seconds integer,
  notes text,
  unit text not null check (unit in ('lbs', 'kg')),
  movement_type text check (movement_type in ('compound', 'isolation')),
  next_weight numeric,
  progressed_at timestamptz,
  unique (session_id, order_index)
);

create index workout_exercises_routine_exercise_idx
  on public.workout_exercises(routine_exercise_id);
alter table public.workout_exercises enable row level security;
create policy "own workout exercises" on public.workout_exercises
  for all to authenticated
  using (exists (select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.workout_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())));
revoke all on public.workout_exercises from anon;
grant select, insert, update, delete on public.workout_exercises to authenticated;

create function public.prepare_workout_exercises(p_session_id uuid)
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
  if not exists (select 1 from public.workout_exercises where session_id = p_session_id) then
    insert into public.workout_exercises (
      session_id, routine_exercise_id, exercise_name, order_index, metric,
      target_sets, target_reps, target_seconds, target_weight, rest_seconds, notes, unit
    )
    select p_session_id, e.id, e.exercise_name, e.order_index, e.metric,
      e.target_sets, e.target_reps, e.target_seconds, e.target_weight,
      e.rest_seconds, e.notes, coalesce(v_unit, 'lbs')
    from public.routine_exercises e
    where e.routine_day_id = v_session.routine_day_id;
  end if;
  return coalesce((select jsonb_agg(to_jsonb(e) order by e.order_index)
    from public.workout_exercises e where e.session_id = p_session_id), '[]'::jsonb);
end;
$$;

create function public.complete_workout_set(
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

create function public.finish_workout(p_session_id uuid)
returns void
language plpgsql security invoker set search_path = public, pg_temp
as $$
declare
  v_session public.workout_sessions%rowtype;
begin
  select * into v_session from public.workout_sessions
    where id = p_session_id and user_id = auth.uid() for update;
  if not found then raise exception 'Workout not found.'; end if;
  if v_session.completed_at is not null then return; end if;
  if not exists (select 1 from public.session_sets where session_id = p_session_id and completed) then
    raise exception 'Complete at least one set before finishing.';
  end if;
  update public.workout_sessions set completed_at = now(), total_volume = (
    select round(coalesce(sum(coalesce(reps, 0) * coalesce(weight, 0)), 0), 2)
    from public.session_sets where session_id = p_session_id and completed
  ) where id = p_session_id;
end;
$$;

revoke all on function public.prepare_workout_exercises(uuid) from public, anon;
revoke all on function public.complete_workout_set(uuid, integer, integer, integer, numeric, text) from public, anon;
revoke all on function public.finish_workout(uuid) from public, anon;
grant execute on function public.prepare_workout_exercises(uuid) to authenticated;
grant execute on function public.complete_workout_set(uuid, integer, integer, integer, numeric, text) to authenticated;
grant execute on function public.finish_workout(uuid) to authenticated;
