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


  -- Unstarted exercise corrections reach a reopened session.
  update public.routine_exercises set target_weight=125 where routine_day_id=v_day and order_index=0;
  v_snapshot := public.prepare_workout_exercises(v_session);
  if (v_snapshot->0->>'target_weight')::numeric <> 125 then raise exception 'Unstarted load stayed frozen'; end if;
  select id into v_exercise from public.workout_exercises where session_id=v_session and order_index=0;
  perform public.complete_workout_set(v_exercise,0,8,null,125,'compound');
  update public.routine_exercises set target_weight=150 where routine_day_id=v_day and order_index=0;
  v_snapshot := public.prepare_workout_exercises(v_session);
  if (v_snapshot->0->>'target_weight')::numeric <> 125 then raise exception 'Started exercise target changed'; end if;
  -- Database constraints reject weights even when bypassing application validation.
  begin
    update public.routine_exercises set target_weight=6000 where routine_day_id=v_day and order_index=1;
    raise exception 'Oversized load accepted';
  exception when check_violation then null;
  end;
  update public.profiles set unit_preference='kg' where id=v_user;
  if abs((select target_weight from public.routine_exercises where routine_day_id=v_day and order_index=0)-68.04)>0.01 then
    raise exception 'Unit conversion failed'; end if;
  if (select unit from public.workout_sessions where id=v_session)<>'lbs' then raise exception 'Original session unit lost'; end if;
  v_snapshot := public.prepare_workout_exercises(v_session);
  if (v_snapshot->0->>'unit')<>'lbs' then raise exception 'Mixed units in original session'; end if;

  -- Concurrency is serialized and replaying a request returns its response.
  v_result := public.acquire_ai_request('coach',gen_random_uuid());
  v_exercise := (v_result->>'leaseId')::uuid;
  begin
    perform public.acquire_ai_request('generation',gen_random_uuid());
    raise exception 'Parallel AI request accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'An AI request is already running. Please wait.' then raise; end if;
  end;
  perform public.record_ai_response(v_exercise,'{"message":"done","routineChanged":false}',true);
  v_plan_exercise := gen_random_uuid();
  v_result := public.acquire_ai_request('coach',v_plan_exercise);
  perform public.record_ai_response((v_result->>'leaseId')::uuid,'{"error":"Saved changes","routineChanged":true}',true);
  v_result := public.acquire_ai_request('coach',v_plan_exercise);
  if v_result->'cached'->>'routineChanged' <> 'true' then raise exception 'Replay lost saved changes'; end if;
  -- Private usage is inaccessible directly, including to its owner.
  begin
    delete from app_private.ai_requests;
    raise exception 'AI usage deletion allowed';
  exception when insufficient_privilege then null;
  end;
  -- Another identity cannot release a user's lease or bypass isolation.
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  perform public.record_ai_response(v_exercise,'{}',true);
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  -- Four more distinct requests hit the per-minute ceiling of six.
  for v_count in 1..4 loop
    v_result := public.acquire_ai_request('coach',gen_random_uuid());
    perform public.record_ai_response((v_result->>'leaseId')::uuid,'{}',true);
  end loop;
  begin
    perform public.acquire_ai_request('coach',gen_random_uuid());
    raise exception 'Minute limit bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Too many requests. Please wait a minute.' then raise; end if;
  end;
  -- Daily generation budget: five distinct requests; duplicates do not count again.
  execute 'reset role';
  update app_private.ai_requests set created_at=now()-interval '2 minutes' where user_id=v_user;
  execute 'set local role authenticated';
  for v_count in 1..5 loop
    v_result := public.acquire_ai_request('generation',gen_random_uuid());
    perform public.record_ai_response((v_result->>'leaseId')::uuid,'{}',true);
  end loop;
  begin
    perform public.acquire_ai_request('generation',gen_random_uuid());
    raise exception 'Daily generation limit bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Daily AI limit reached. Please try again tomorrow.' then raise; end if;
  end;
  execute 'reset role';
  update app_private.ai_requests set created_at=now()-interval '2 minutes' where user_id=v_user;
  -- Existing daily coach attempts count even if the request failed.
  insert into app_private.ai_requests(user_id,request_id,feature,created_at,finished)
  select v_user,gen_random_uuid(),'coach',now()-interval '2 minutes',true from generate_series(1,24);
  execute 'set local role authenticated';
  begin
    perform public.acquire_ai_request('coach',gen_random_uuid());
    raise exception 'Daily coach limit bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Daily AI limit reached. Please try again tomorrow.' then raise; end if;
  end;
  execute 'reset role';
  -- Anonymous identities have a separate three-request daily limit and cannot generate.
  v_user := gen_random_uuid();
  insert into auth.users(id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
  values(v_user,'authenticated','authenticated',v_user::text || '@demo-test.invalid','{}','{}',now(),now());
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user,'role','authenticated','is_anonymous',true)::text,true);
  execute 'set local role authenticated';
  begin
    perform public.acquire_ai_request('generation',gen_random_uuid());
    raise exception 'Anonymous generation allowed';
  exception when insufficient_privilege then null;
  end;
  for v_count in 1..3 loop
    v_result := public.acquire_ai_request('coach',gen_random_uuid());
    perform public.record_ai_response((v_result->>'leaseId')::uuid,'{}',true);
  end loop;
  begin
    perform public.acquire_ai_request('coach',gen_random_uuid());
    raise exception 'Anonymous daily limit bypassed';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'Daily AI limit reached. Please try again tomorrow.' then raise; end if;
  end;
  execute 'reset role';
end;
$$;
rollback;
select 'Audit integration checks passed; all fixtures rolled back.' as result;
