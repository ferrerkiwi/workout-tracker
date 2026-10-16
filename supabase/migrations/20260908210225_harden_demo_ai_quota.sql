alter table public.demo_ai_usage
  drop constraint demo_ai_usage_pkey,
  drop column routine_coach_requests,
  add column request_index integer not null default 1
    check (request_index between 1 and 3),
  add primary key (user_id, usage_date, request_index);

grant select, insert on table public.demo_ai_usage to authenticated;

create policy "own demo AI usage read"
on public.demo_ai_usage
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "own demo AI usage insert"
on public.demo_ai_usage
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and usage_date = current_date
  and request_index between 1 and 3
);

create or replace function public.consume_demo_coach_request()
returns integer
language plpgsql
security invoker
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

  -- Serialise requests for this one user so parallel API calls cannot exceed
  -- the quota between the count and insert.
  perform pg_advisory_xact_lock(hashtext(v_user_id::text));

  select count(*)
  into v_requests
  from public.demo_ai_usage
  where user_id = v_user_id
    and usage_date = current_date;

  if v_requests >= 3 then
    raise exception 'Demo coach limit reached.' using errcode = 'P0001';
  end if;

  insert into public.demo_ai_usage (user_id, usage_date, request_index)
  values (v_user_id, current_date, v_requests + 1);

  return v_requests + 1;
end;
$$;

revoke all on function public.consume_demo_coach_request() from public;
revoke all on function public.consume_demo_coach_request() from anon;
grant execute on function public.consume_demo_coach_request() to authenticated;
