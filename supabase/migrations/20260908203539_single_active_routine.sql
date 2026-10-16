-- Routines used to be calendar-week snapshots. Preserve those rows for
-- historical session links, but designate one recurring plan per user.
alter table public.routines
  add column if not exists is_active boolean not null default false;

update public.routines
set is_active = false;

with latest_routine as (
  select distinct on (user_id) id
  from public.routines
  order by user_id, week_start_date desc, created_at desc, id desc
)
update public.routines routine
set is_active = true
from latest_routine
where routine.id = latest_routine.id;

create unique index if not exists routines_one_active_per_user_idx
  on public.routines (user_id)
  where is_active;

comment on column public.routines.week_start_date is
  'Legacy creation-week anchor. The active recurring plan is selected by is_active.';

create or replace function public.save_active_routine(
  p_days jsonb,
  p_generated_by_model text,
  p_generation_prompt_version text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_routine_id uuid;
  v_day jsonb;
  v_day_id uuid;
  v_day_index int;
  v_day_name text;
  v_is_rest_day boolean;
  v_seen_day_indexes integer[] := '{}';
  v_exercise jsonb;
  v_order_index int;
  v_metric text;
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  if jsonb_typeof(p_days) <> 'array' then
    raise exception 'Routine days must be an array.' using errcode = '22023';
  end if;

  select id
  into v_routine_id
  from public.routines
  where user_id = v_user_id
    and is_active
  for update;

  if v_routine_id is null then
    insert into public.routines (
      user_id,
      week_start_date,
      is_active,
      generated_by_model,
      generation_prompt_version
    )
    values (
      v_user_id,
      date_trunc('week', current_date)::date,
      true,
      p_generated_by_model,
      p_generation_prompt_version
    )
    on conflict (user_id) where is_active do nothing
    returning id into v_routine_id;

    if v_routine_id is null then
      select id
      into v_routine_id
      from public.routines
      where user_id = v_user_id
        and is_active
      for update;
    end if;
  end if;

  update public.routines
  set
    generated_by_model = p_generated_by_model,
    generation_prompt_version = p_generation_prompt_version
  where id = v_routine_id;

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    v_day_index := (v_day ->> 'day_of_week')::int;
    v_is_rest_day := coalesce((v_day ->> 'is_rest_day')::boolean, false);
    v_day_name := coalesce(
      nullif(btrim(v_day ->> 'name'), ''),
      case when v_is_rest_day then 'Rest' else 'Workout' end
    );

    if v_day_index < 0 or v_day_index > 6 then
      raise exception 'Invalid day_of_week: %', v_day_index using errcode = '22023';
    end if;

    if v_day_index = any(v_seen_day_indexes) then
      raise exception 'Routine contains duplicate day_of_week values.' using errcode = '22023';
    end if;
    v_seen_day_indexes := array_append(v_seen_day_indexes, v_day_index);

    insert into public.routine_days (
      routine_id,
      day_of_week,
      name,
      is_rest_day
    )
    values (
      v_routine_id,
      v_day_index,
      v_day_name,
      v_is_rest_day
    )
    on conflict (routine_id, day_of_week)
    do update set
      name = excluded.name,
      is_rest_day = excluded.is_rest_day
    returning id into v_day_id;

    delete from public.routine_exercises
    where routine_day_id = v_day_id;

    if not v_is_rest_day then
      v_order_index := 0;
      for v_exercise in
        select value
        from jsonb_array_elements(
          case
            when jsonb_typeof(v_day -> 'exercises') = 'array'
              then v_day -> 'exercises'
            else '[]'::jsonb
          end
        )
      loop
        v_metric := case
          when v_exercise ->> 'metric' = 'time' then 'time'
          else 'reps'
        end;

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
        values (
          v_day_id,
          v_order_index,
          v_exercise ->> 'name',
          v_metric,
          least(20, greatest(1, (v_exercise ->> 'sets')::int)),
          least(100, greatest(1, (v_exercise ->> 'reps')::int)),
          case
            when v_metric = 'time'
              then least(
                3600,
                greatest(1, coalesce((v_exercise ->> 'duration_seconds')::int, 45))
              )
            else null
          end,
          (v_exercise ->> 'suggested_weight')::numeric,
          least(900, greatest(0, (v_exercise ->> 'rest_seconds')::int)),
          nullif(btrim(v_exercise ->> 'notes'), '')
        );

        v_order_index := v_order_index + 1;
      end loop;
    end if;
  end loop;

  if cardinality(v_seen_day_indexes) <> 7 then
    raise exception 'Routine must include all seven days.' using errcode = '22023';
  end if;

  return v_routine_id;
end;
$$;

create or replace function public.reset_active_plan_to_empty()
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_routine_id uuid;
  v_day_index int;
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  select id
  into v_routine_id
  from public.routines
  where user_id = v_user_id
    and is_active
  for update;

  if v_routine_id is null then
    insert into public.routines (
      user_id,
      week_start_date,
      is_active,
      generated_by_model,
      generation_prompt_version
    )
    values (
      v_user_id,
      date_trunc('week', current_date)::date,
      true,
      null,
      null
    )
    on conflict (user_id) where is_active do nothing
    returning id into v_routine_id;

    if v_routine_id is null then
      select id
      into v_routine_id
      from public.routines
      where user_id = v_user_id
        and is_active
      for update;
    end if;
  else
    update public.routines
    set
      generated_by_model = null,
      generation_prompt_version = null
    where id = v_routine_id;
  end if;

  for v_day_index in 0..6
  loop
    insert into public.routine_days (
      routine_id,
      day_of_week,
      name,
      is_rest_day
    )
    values (v_routine_id, v_day_index, 'Rest', true)
    on conflict (routine_id, day_of_week)
    do update set
      name = excluded.name,
      is_rest_day = excluded.is_rest_day;
  end loop;

  delete from public.routine_exercises
  where routine_day_id in (
    select id
    from public.routine_days
    where routine_id = v_routine_id
  );

  return v_routine_id;
end;
$$;

revoke all on function public.save_active_routine(jsonb, text, text) from public;
revoke all on function public.save_active_routine(jsonb, text, text) from anon;
grant execute on function public.save_active_routine(jsonb, text, text) to authenticated;

revoke all on function public.reset_active_plan_to_empty() from public;
revoke all on function public.reset_active_plan_to_empty() from anon;
grant execute on function public.reset_active_plan_to_empty() to authenticated;

drop function if exists public.copy_last_weekly_plan(date);
drop function if exists public.ensure_current_weekly_routine(date);
drop function if exists public.save_weekly_routine(date, jsonb, text, text);
drop function if exists public.reset_weekly_plan_to_empty(date);
