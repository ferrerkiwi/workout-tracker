-- Integration regression: run against a migrated database as an administrator.
-- All fixtures and writes are rolled back, including the synthetic auth user.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_routine uuid;
  v_day uuid;
  v_session uuid;
  v_exercise uuid;
  v_plan_exercise uuid;
  v_snapshot jsonb;
  v_result jsonb;
  v_number numeric;
  v_count integer;
begin
  insert into auth.users(id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values (v_user, 'authenticated', 'authenticated', v_user::text || '@workout-test.invalid',
    '{"display_name":"Workout regression"}', '{}', now(), now());
  update public.profiles set unit_preference = 'lbs' where id = v_user;
  insert into public.routines(user_id, week_start_date, is_active)
    values (v_user, current_date, true) returning id into v_routine;
  insert into public.routine_days(routine_id, day_of_week, name, is_rest_day)
    values (v_routine, 0, 'Regression workout', false) returning id into v_day;
  insert into public.routine_exercises(routine_day_id, order_index, exercise_name, metric, target_sets, target_reps, target_weight)
  select v_day, n, 'Regression exercise ' || case when n = 6 then 0 else n end, 'reps', 2, 8, 100 from generate_series(0, 6) n;
  insert into public.routine_exercises(routine_day_id, order_index, exercise_name, metric, target_sets, target_reps, target_seconds)
    values (v_day, 7, 'Regression hold', 'time', 2, 8, 30);
  insert into public.workout_sessions(user_id, routine_day_id, performed_on, name)
    values (v_user, v_day, current_date, 'Regression workout') returning id into v_session;
  perform set_config('request.jwt.claim.sub', v_user::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  v_snapshot := public.prepare_workout_exercises(v_session);
  if jsonb_array_length(v_snapshot) <> 8 then raise exception 'Snapshot missing exercises'; end if;
  if public.prepare_workout_exercises(v_session) <> v_snapshot then raise exception 'Snapshot initialization is not idempotent'; end if;
  begin
    perform public.finish_workout(v_session);
    raise exception 'Empty workout was accepted';
  exception when others then
    if sqlerrm <> 'Complete at least one set before finishing.' then raise; end if;
  end;

  -- Compound: incomplete sets cannot progress; meeting or exceeding all targets can.
  select id, routine_exercise_id into v_exercise, v_plan_exercise from public.workout_exercises where session_id = v_session and order_index = 0;
  v_result := public.complete_workout_set(v_exercise, 0, 8, null, 100, 'compound');
  if v_result->>'nextWeight' is not null then raise exception 'Progressed before every set'; end if;
  v_result := public.complete_workout_set(v_exercise, 1, 9, null, 100, 'compound');
  if (v_result->>'nextWeight')::numeric <> 110 then raise exception 'Compound increment is incorrect'; end if;
  perform public.complete_workout_set(v_exercise, 1, 9, null, 100, 'compound');
  select target_weight into v_number from public.routine_exercises where id = v_plan_exercise;
  if v_number <> 110 then raise exception 'Retry increased weight twice'; end if;
  begin
    perform public.complete_workout_set(v_exercise, 1, 10, null, 100, 'compound');
    raise exception 'Changed completed set was accepted';
  exception when others then
    if sqlerrm <> 'That set is already saved. Refresh the workout to continue.' then raise; end if;
  end;
  v_snapshot := public.prepare_workout_exercises(v_session);
  if (v_snapshot->0->>'target_weight')::numeric <> 100 or (v_snapshot->0->>'next_weight')::numeric <> 110 then
    raise exception 'Reload lost original targets or progression';
  end if;

  -- Isolation uses five pounds, including when the user corrects the type.
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 1;
  perform public.complete_workout_set(v_exercise, 0, 8, null, 100, 'isolation');
  v_result := public.complete_workout_set(v_exercise, 1, 8, null, 100, 'isolation');
  if (v_result->>'nextWeight')::numeric <> 105 then raise exception 'Isolation increment is incorrect'; end if;

  -- One missed rep target prevents an increase.
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 2;
  perform public.complete_workout_set(v_exercise, 0, 7, null, 100, 'compound');
  v_result := public.complete_workout_set(v_exercise, 1, 8, null, 100, 'compound');
  if v_result->>'nextWeight' is not null then raise exception 'Missed rep target progressed'; end if;

  -- Bodyweight and timed exercises keep their plan weight.
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 3;
  perform public.complete_workout_set(v_exercise, 0, 8, null, null, null);
  v_result := public.complete_workout_set(v_exercise, 1, 8, null, null, null);
  if v_result->>'nextWeight' is not null then raise exception 'Bodyweight exercise progressed'; end if;
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 7;
  perform public.complete_workout_set(v_exercise, 0, null, 30, 100, null);
  v_result := public.complete_workout_set(v_exercise, 1, null, 30, 100, null);
  if v_result->>'nextWeight' is not null then raise exception 'Timed exercise progressed'; end if;

  -- Mid-workout plan edits are never overwritten by progression.
  select id, routine_exercise_id into v_exercise, v_plan_exercise from public.workout_exercises where session_id = v_session and order_index = 4;
  update public.routine_exercises set target_weight = 125 where id = v_plan_exercise;
  perform public.complete_workout_set(v_exercise, 0, 8, null, 100, 'compound');
  v_result := public.complete_workout_set(v_exercise, 1, 8, null, 100, 'compound');
  if v_result->>'nextWeight' is not null then raise exception 'Overwrote a mid-workout edit'; end if;
  select target_weight into v_number from public.routine_exercises where id = v_plan_exercise;
  if v_number <> 125 then raise exception 'Mid-workout weight edit was lost'; end if;

  -- Unknown exercises require a choice for loaded rep work, but bad input saves nothing.
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 5;
  begin
    perform public.complete_workout_set(v_exercise, 0, 8, null, 100, null);
    raise exception 'Unclassified weighted set was accepted';
  exception when others then
    if sqlerrm <> 'Choose an exercise type before saving a weighted set.' then raise; end if;
  end;
  begin
    perform public.complete_workout_set(v_exercise, 2, 8, null, 100, 'compound');
    raise exception 'Out of range set was accepted';
  exception when others then
    if sqlerrm <> 'Invalid set number.' then raise; end if;
  end;

  -- Same-name exercises remain independent; another exercise's completed sets
  -- must never satisfy this one's targets or overwrite its log entries.
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 6;
  v_result := public.complete_workout_set(v_exercise, 0, 8, null, 100, 'compound');
  if v_result->>'nextWeight' is not null then raise exception 'Same-name exercise borrowed completed sets'; end if;
  select count(*) into v_count from public.session_sets
    where session_id = v_session and exercise_name = 'Regression exercise 0';
  if v_count <> 3 then raise exception 'Same-name exercises overwrote each other'; end if;

  -- RLS prevents a second identity from reading or writing this session.
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  select count(*) into v_count from public.workout_exercises where session_id = v_session;
  if v_count <> 0 then raise exception 'Another user can see this workout'; end if;
  begin
    perform public.complete_workout_set(v_exercise, 0, 8, null, 100, 'compound');
    raise exception 'Another user saved a set';
  exception when others then
    if sqlerrm <> 'Exercise not found.' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', v_user::text, true);

  -- Finishing early is supported; retries are safe, and finished sessions reject writes.
  perform public.finish_workout(v_session);
  perform public.finish_workout(v_session);
  select total_volume into v_number from public.workout_sessions where id = v_session;
  if v_number <> 7200 then raise exception 'Incorrect saved volume: %', v_number; end if;
  begin
    perform public.complete_workout_set(v_exercise, 0, 8, null, 100, 'compound');
    raise exception 'Finished workout accepted a set';
  exception when others then
    if sqlerrm <> 'That workout is not open.' then raise; end if;
  end;

  -- Kilogram workouts freeze units and convert pound increases correctly.
  update public.profiles set unit_preference = 'kg' where id = v_user;
  insert into public.workout_sessions(user_id, routine_day_id, performed_on, name)
    values (v_user, v_day, current_date, 'Kilogram regression') returning id into v_session;
  perform public.prepare_workout_exercises(v_session);
  update public.profiles set unit_preference = 'lbs' where id = v_user;
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 0;
  perform public.complete_workout_set(v_exercise, 0, 8, null, 110, 'compound');
  v_result := public.complete_workout_set(v_exercise, 1, 8, null, 110, 'compound');
  if (v_result->>'nextWeight')::numeric <> 114.54 then raise exception 'Kilogram compound increase is incorrect'; end if;
  select id into v_exercise from public.workout_exercises where session_id = v_session and order_index = 1;
  perform public.complete_workout_set(v_exercise, 0, 8, null, 105, 'isolation');
  v_result := public.complete_workout_set(v_exercise, 1, 8, null, 105, 'isolation');
  if (v_result->>'nextWeight')::numeric <> 107.27 then raise exception 'Kilogram isolation increase is incorrect'; end if;
  execute 'reset role';
end;
$$;
rollback;
select 'Workout progression integration checks passed; all fixtures rolled back.' as result;
