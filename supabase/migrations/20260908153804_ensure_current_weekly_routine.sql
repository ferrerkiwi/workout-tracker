-- Lazily create an independent current-week snapshot from the user's latest
-- earlier routine. The surrounding function call is transactional, so no
-- partial day/exercise copy can survive an error.
create or replace function public.ensure_current_weekly_routine(
  p_week_start_date date
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_source_routine_id uuid;
  v_current_routine_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if p_week_start_date <> date_trunc('week', p_week_start_date)::date then
    raise exception 'Week start date must be a Monday.' using errcode = '22023';
  end if;

  if p_week_start_date <> date_trunc('week', current_date)::date then
    raise exception 'Only the current week can be initialized.' using errcode = '22023';
  end if;

  select id
  into v_current_routine_id
  from public.routines
  where user_id = v_user_id
    and week_start_date = p_week_start_date;

  if v_current_routine_id is not null then
    return v_current_routine_id;
  end if;

  select id
  into v_source_routine_id
  from public.routines
  where user_id = v_user_id
    and week_start_date < p_week_start_date
  order by week_start_date desc
  limit 1;

  if v_source_routine_id is null then
    return null;
  end if;

  insert into public.routines (
    user_id,
    week_start_date,
    generated_by_model,
    generation_prompt_version
  )
  values (v_user_id, p_week_start_date, null, null)
  on conflict (user_id, week_start_date) do nothing
  returning id into v_current_routine_id;

  -- A concurrent initializer won the unique (user_id, week_start_date) race.
  -- Its completed snapshot is the canonical result, so leave it untouched.
  if v_current_routine_id is null then
    select id
    into v_current_routine_id
    from public.routines
    where user_id = v_user_id
      and week_start_date = p_week_start_date;

    return v_current_routine_id;
  end if;

  insert into public.routine_days (
    routine_id,
    day_of_week,
    name,
    is_rest_day
  )
  select
    v_current_routine_id,
    day_of_week,
    name,
    is_rest_day
  from public.routine_days
  where routine_id = v_source_routine_id;

  insert into public.routine_exercises (
    routine_day_id,
    order_index,
    exercise_name,
    metric,
    target_sets,
    target_reps,
    target_seconds,
    target_weight,
    rest_seconds,
    notes
  )
  select
    current_day.id,
    exercise.order_index,
    exercise.exercise_name,
    exercise.metric,
    exercise.target_sets,
    exercise.target_reps,
    exercise.target_seconds,
    exercise.target_weight,
    exercise.rest_seconds,
    exercise.notes
  from public.routine_exercises exercise
  join public.routine_days source_day on source_day.id = exercise.routine_day_id
  join public.routine_days current_day
    on current_day.routine_id = v_current_routine_id
    and current_day.day_of_week = source_day.day_of_week
  where source_day.routine_id = v_source_routine_id;

  return v_current_routine_id;
end;
$$;

revoke all on function public.ensure_current_weekly_routine(date) from public;
revoke all on function public.ensure_current_weekly_routine(date) from anon;
grant execute on function public.ensure_current_weekly_routine(date) to authenticated;
