-- Copy a completed prior weekly plan without changing its historical rows or
-- any workout sessions that already point at those routine-day ids.
create or replace function public.copy_last_weekly_plan(
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
  v_new_routine_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if p_week_start_date <> date_trunc('week', p_week_start_date)::date then
    raise exception 'Week start date must be a Monday.' using errcode = '22023';
  end if;

  if p_week_start_date <> date_trunc('week', current_date)::date then
    raise exception 'Only the current week can be created.' using errcode = '22023';
  end if;

  select id
  into v_source_routine_id
  from public.routines
  where user_id = v_user_id
    and week_start_date = p_week_start_date - 7;

  if v_source_routine_id is null then
    raise exception 'No plan exists for last week.' using errcode = 'P0002';
  end if;

  insert into public.routines (
    user_id,
    week_start_date,
    generated_by_model,
    generation_prompt_version
  )
  values (v_user_id, p_week_start_date, null, null)
  on conflict (user_id, week_start_date) do nothing
  returning id into v_new_routine_id;

  if v_new_routine_id is null then
    raise exception 'A plan already exists for this week.' using errcode = '23505';
  end if;

  insert into public.routine_days (
    routine_id,
    day_of_week,
    name,
    is_rest_day
  )
  select
    v_new_routine_id,
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
    new_day.id,
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
  join public.routine_days old_day on old_day.id = exercise.routine_day_id
  join public.routine_days new_day
    on new_day.routine_id = v_new_routine_id
    and new_day.day_of_week = old_day.day_of_week
  where old_day.routine_id = v_source_routine_id;

  return v_new_routine_id;
end;
$$;

revoke all on function public.copy_last_weekly_plan(date) from public;
revoke all on function public.copy_last_weekly_plan(date) from anon;
grant execute on function public.copy_last_weekly_plan(date) to authenticated;
