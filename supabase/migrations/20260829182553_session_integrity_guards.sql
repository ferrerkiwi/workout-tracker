-- Keep the application-level session flow safe when two tabs start the same
-- workout or a reset request is interrupted between network calls.

create unique index workout_sessions_one_open_session_per_day_idx
  on public.workout_sessions (user_id, routine_day_id, performed_on)
  where completed_at is null and routine_day_id is not null;

alter table public.session_sets
  add constraint session_sets_order_index_range_ck
    check (order_index >= 0 and order_index <= 99),
  add constraint session_sets_set_index_range_ck
    check (set_index >= 0 and set_index <= 99),
  add constraint session_sets_reps_range_ck
    check (reps is null or (reps >= 0 and reps <= 1000)),
  add constraint session_sets_weight_range_ck
    check (weight is null or (weight >= 0 and weight <= 5000)),
  add constraint session_sets_one_metric_ck
    check (num_nonnulls(reps, seconds) <= 1);

create or replace function public.reset_training_data()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not signed in.' using errcode = '28000';
  end if;

  delete from public.workout_sessions where user_id = v_user_id;
  delete from public.routines where user_id = v_user_id;
  delete from public.preferences where user_id = v_user_id;
  update public.profiles
  set onboarded_at = null
  where id = v_user_id;
end;
$$;

revoke all on function public.reset_training_data() from public;
revoke all on function public.reset_training_data() from anon;
grant execute on function public.reset_training_data() to authenticated;
