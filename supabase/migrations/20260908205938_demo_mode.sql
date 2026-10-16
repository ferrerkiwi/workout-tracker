create table public.demo_ai_usage (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  routine_coach_requests integer not null default 0
    check (routine_coach_requests >= 0),
  created_at timestamptz not null default now()
);

alter table public.demo_ai_usage enable row level security;
revoke all on table public.demo_ai_usage from public, anon, authenticated;

create or replace function public.initialize_demo_mode()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_onboarded_at timestamptz;
  v_week_start date := date_trunc('week', current_date)::date;
  v_push_day_id uuid;
  v_legs_day_id uuid;
  v_upper_day_id uuid;
  v_push_session_id uuid;
  v_legs_session_id uuid;
  v_upper_session_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception 'Demo initialization requires an anonymous user.' using errcode = '42501';
  end if;

  -- The row lock makes concurrent retries idempotent for one demo account.
  select onboarded_at
  into v_onboarded_at
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Demo profile was not created.' using errcode = 'P0001';
  end if;
  if v_onboarded_at is not null then
    return;
  end if;

  insert into public.preferences (
    user_id,
    goals,
    experience_level,
    days_per_week,
    session_length_min,
    equipment,
    focus_muscles,
    limitations
  )
  values (
    v_user_id,
    array['build_muscle'],
    'intermediate',
    5,
    60,
    array['Barbell', 'Dumbbells', 'Cable machine', 'Machines', 'Pull-up bar'],
    array['Chest', 'Back', 'Quads', 'Hamstrings', 'Shoulders'],
    null
  )
  on conflict (user_id) do update set
    goals = excluded.goals,
    experience_level = excluded.experience_level,
    days_per_week = excluded.days_per_week,
    session_length_min = excluded.session_length_min,
    equipment = excluded.equipment,
    focus_muscles = excluded.focus_muscles,
    limitations = excluded.limitations,
    updated_at = now();

  perform public.save_active_routine(
    '[
      {"day_of_week":0,"name":"Push","is_rest_day":false,"exercises":[
        {"name":"Barbell Bench Press","metric":"reps","sets":3,"reps":8,"duration_seconds":null,"suggested_weight":135,"rest_seconds":120,"notes":"Pause briefly at the chest."},
        {"name":"Incline Dumbbell Press","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":55,"rest_seconds":90,"notes":"Keep the incline moderate."},
        {"name":"Cable Lateral Raise","metric":"reps","sets":3,"reps":15,"duration_seconds":null,"suggested_weight":15,"rest_seconds":60,"notes":"Lead with the elbows."},
        {"name":"Rope Pressdown","metric":"reps","sets":3,"reps":12,"duration_seconds":null,"suggested_weight":40,"rest_seconds":60,"notes":"Control the return."}
      ]},
      {"day_of_week":1,"name":"Pull","is_rest_day":false,"exercises":[
        {"name":"Pull-ups","metric":"reps","sets":3,"reps":6,"duration_seconds":null,"suggested_weight":null,"rest_seconds":120,"notes":"Use a full hang."},
        {"name":"Chest-Supported Row","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":70,"rest_seconds":90,"notes":"Pause at the top."},
        {"name":"Lat Pulldown","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":100,"rest_seconds":90,"notes":"Drive elbows down."},
        {"name":"Hammer Curl","metric":"reps","sets":3,"reps":12,"duration_seconds":null,"suggested_weight":30,"rest_seconds":60,"notes":"Keep shoulders still."}
      ]},
      {"day_of_week":2,"name":"Legs","is_rest_day":false,"exercises":[
        {"name":"Back Squat","metric":"reps","sets":3,"reps":8,"duration_seconds":null,"suggested_weight":185,"rest_seconds":150,"notes":"Brace before each rep."},
        {"name":"Romanian Deadlift","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":155,"rest_seconds":120,"notes":"Keep the bar close."},
        {"name":"Leg Extension","metric":"reps","sets":3,"reps":12,"duration_seconds":null,"suggested_weight":100,"rest_seconds":75,"notes":"Squeeze at the top."},
        {"name":"Plank","metric":"time","sets":3,"reps":1,"duration_seconds":45,"suggested_weight":null,"rest_seconds":45,"notes":"Keep ribs stacked over hips."}
      ]},
      {"day_of_week":3,"name":"Rest","is_rest_day":true,"exercises":[]},
      {"day_of_week":4,"name":"Upper","is_rest_day":false,"exercises":[
        {"name":"Dumbbell Bench Press","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":60,"rest_seconds":90,"notes":"Use a controlled lower."},
        {"name":"Seated Cable Row","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":80,"rest_seconds":90,"notes":"Avoid shrugging."},
        {"name":"Seated Dumbbell Press","metric":"reps","sets":3,"reps":8,"duration_seconds":null,"suggested_weight":45,"rest_seconds":90,"notes":"Keep your core tall."},
        {"name":"Face Pull","metric":"reps","sets":3,"reps":15,"duration_seconds":null,"suggested_weight":35,"rest_seconds":60,"notes":"Pull toward eye level."}
      ]},
      {"day_of_week":5,"name":"Lower","is_rest_day":false,"exercises":[
        {"name":"Deadlift","metric":"reps","sets":3,"reps":5,"duration_seconds":null,"suggested_weight":225,"rest_seconds":180,"notes":"Reset before every rep."},
        {"name":"Bulgarian Split Squat","metric":"reps","sets":3,"reps":10,"duration_seconds":null,"suggested_weight":35,"rest_seconds":90,"notes":"Each leg."},
        {"name":"Seated Leg Curl","metric":"reps","sets":3,"reps":12,"duration_seconds":null,"suggested_weight":85,"rest_seconds":75,"notes":"Control the eccentric."},
        {"name":"Standing Calf Raise","metric":"reps","sets":3,"reps":15,"duration_seconds":null,"suggested_weight":90,"rest_seconds":60,"notes":"Pause at both ends."}
      ]},
      {"day_of_week":6,"name":"Rest","is_rest_day":true,"exercises":[]}
    ]'::jsonb,
    'demo-static',
    'demo-v1'
  );

  select day.id into v_push_day_id
  from public.routine_days day
  join public.routines routine on routine.id = day.routine_id
  where routine.user_id = v_user_id and routine.is_active and day.day_of_week = 0;

  select day.id into v_legs_day_id
  from public.routine_days day
  join public.routines routine on routine.id = day.routine_id
  where routine.user_id = v_user_id and routine.is_active and day.day_of_week = 2;

  select day.id into v_upper_day_id
  from public.routine_days day
  join public.routines routine on routine.id = day.routine_id
  where routine.user_id = v_user_id and routine.is_active and day.day_of_week = 4;

  insert into public.workout_sessions (user_id, routine_day_id, name, performed_on, completed_at, total_volume)
  values (v_user_id, v_push_day_id, 'Push', v_week_start - 14, now() - interval '14 days', 7005)
  returning id into v_push_session_id;

  insert into public.session_sets (session_id, exercise_name, order_index, set_index, reps, weight, completed)
  values
    (v_push_session_id, 'Barbell Bench Press', 0, 0, 8, 135, true),
    (v_push_session_id, 'Barbell Bench Press', 0, 1, 8, 135, true),
    (v_push_session_id, 'Barbell Bench Press', 0, 2, 8, 135, true),
    (v_push_session_id, 'Incline Dumbbell Press', 1, 0, 10, 55, true),
    (v_push_session_id, 'Incline Dumbbell Press', 1, 1, 10, 55, true),
    (v_push_session_id, 'Incline Dumbbell Press', 1, 2, 10, 55, true),
    (v_push_session_id, 'Cable Lateral Raise', 2, 0, 15, 15, true),
    (v_push_session_id, 'Cable Lateral Raise', 2, 1, 15, 15, true),
    (v_push_session_id, 'Cable Lateral Raise', 2, 2, 15, 15, true),
    (v_push_session_id, 'Rope Pressdown', 3, 0, 12, 40, true),
    (v_push_session_id, 'Rope Pressdown', 3, 1, 12, 40, true),
    (v_push_session_id, 'Rope Pressdown', 3, 2, 12, 40, true);

  insert into public.workout_sessions (user_id, routine_day_id, name, performed_on, completed_at, total_volume)
  values (v_user_id, v_legs_day_id, 'Legs', v_week_start - 12, now() - interval '12 days', 12690)
  returning id into v_legs_session_id;

  insert into public.session_sets (session_id, exercise_name, order_index, set_index, reps, seconds, weight, completed)
  values
    (v_legs_session_id, 'Back Squat', 0, 0, 8, null, 185, true),
    (v_legs_session_id, 'Back Squat', 0, 1, 8, null, 185, true),
    (v_legs_session_id, 'Back Squat', 0, 2, 8, null, 185, true),
    (v_legs_session_id, 'Romanian Deadlift', 1, 0, 10, null, 155, true),
    (v_legs_session_id, 'Romanian Deadlift', 1, 1, 10, null, 155, true),
    (v_legs_session_id, 'Romanian Deadlift', 1, 2, 10, null, 155, true),
    (v_legs_session_id, 'Leg Extension', 2, 0, 12, null, 100, true),
    (v_legs_session_id, 'Leg Extension', 2, 1, 12, null, 100, true),
    (v_legs_session_id, 'Leg Extension', 2, 2, 12, null, 100, true),
    (v_legs_session_id, 'Plank', 3, 0, null, 45, null, true),
    (v_legs_session_id, 'Plank', 3, 1, null, 45, null, true),
    (v_legs_session_id, 'Plank', 3, 2, null, 45, null, true);

  insert into public.workout_sessions (user_id, routine_day_id, name, performed_on, completed_at, total_volume)
  values (v_user_id, v_upper_day_id, 'Upper', v_week_start - 3, now() - interval '3 days', 8280)
  returning id into v_upper_session_id;

  insert into public.session_sets (session_id, exercise_name, order_index, set_index, reps, weight, completed)
  values
    (v_upper_session_id, 'Dumbbell Bench Press', 0, 0, 10, 60, true),
    (v_upper_session_id, 'Dumbbell Bench Press', 0, 1, 10, 60, true),
    (v_upper_session_id, 'Dumbbell Bench Press', 0, 2, 10, 60, true),
    (v_upper_session_id, 'Seated Cable Row', 1, 0, 10, 80, true),
    (v_upper_session_id, 'Seated Cable Row', 1, 1, 10, 80, true),
    (v_upper_session_id, 'Seated Cable Row', 1, 2, 10, 80, true),
    (v_upper_session_id, 'Seated Dumbbell Press', 2, 0, 8, 45, true),
    (v_upper_session_id, 'Seated Dumbbell Press', 2, 1, 8, 45, true),
    (v_upper_session_id, 'Seated Dumbbell Press', 2, 2, 8, 45, true),
    (v_upper_session_id, 'Face Pull', 3, 0, 15, 35, true),
    (v_upper_session_id, 'Face Pull', 3, 1, 15, 35, true),
    (v_upper_session_id, 'Face Pull', 3, 2, 15, 35, true);

  update public.profiles
  set display_name = 'Demo User', unit_preference = 'lbs', onboarded_at = now()
  where id = v_user_id;
end;
$$;

create or replace function public.consume_demo_coach_request()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_requests integer;
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;
  if coalesce(auth.jwt() ->> 'is_anonymous', 'false') <> 'true' then
    raise exception 'Demo quota is only available to anonymous users.' using errcode = '42501';
  end if;

  insert into public.demo_ai_usage (user_id, usage_date, routine_coach_requests)
  values (v_user_id, current_date, 1)
  on conflict (user_id) do update
  set
    usage_date = case
      when public.demo_ai_usage.usage_date < current_date then current_date
      else public.demo_ai_usage.usage_date
    end,
    routine_coach_requests = case
      when public.demo_ai_usage.usage_date < current_date then 1
      else public.demo_ai_usage.routine_coach_requests + 1
    end
  where public.demo_ai_usage.usage_date < current_date
     or public.demo_ai_usage.routine_coach_requests < 3
  returning routine_coach_requests into v_requests;

  if v_requests is null then
    raise exception 'Demo coach limit reached.' using errcode = 'P0001';
  end if;

  return v_requests;
end;
$$;

revoke all on function public.initialize_demo_mode() from public;
revoke all on function public.initialize_demo_mode() from anon;
grant execute on function public.initialize_demo_mode() to authenticated;

revoke all on function public.consume_demo_coach_request() from public;
revoke all on function public.consume_demo_coach_request() from anon;
grant execute on function public.consume_demo_coach_request() to authenticated;
