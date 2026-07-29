-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles Table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  goals text,
  equipment_limitations text[],
  comfort_levels text[]
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2. Workouts Table
create table public.workouts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  muscle_groups_targeted text[] not null,
  notes text
);

-- Enable RLS for workouts
alter table public.workouts enable row level security;
create policy "Users can view own workouts" on public.workouts for select using (auth.uid() = user_id);
create policy "Users can insert own workouts" on public.workouts for insert with check (auth.uid() = user_id);

-- 3. Workout Exercises Table
create table public.workout_exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  exercise_name text not null,
  order_index integer not null,
  type text check (type in ('warmup', 'strength', 'cooldown')) not null,
  notes text
);

-- Enable RLS for workout_exercises
alter table public.workout_exercises enable row level security;
create policy "Users can view own exercises" on public.workout_exercises for select using (
  exists (select 1 from public.workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid())
);
create policy "Users can insert own exercises" on public.workout_exercises for insert with check (
  exists (select 1 from public.workouts where workouts.id = workout_exercises.workout_id and workouts.user_id = auth.uid())
);

-- 4. Sets Table
create table public.sets (
  id uuid default uuid_generate_v4() primary key,
  workout_exercise_id uuid references public.workout_exercises(id) on delete cascade not null,
  set_number integer not null,
  reps integer not null,
  weight_lbs numeric not null,
  completed boolean default false not null
);

-- Enable RLS for sets
alter table public.sets enable row level security;
create policy "Users can view own sets" on public.sets for select using (
  exists (
    select 1 from public.workout_exercises
    join public.workouts on workouts.id = workout_exercises.workout_id
    where workout_exercises.id = sets.workout_exercise_id and workouts.user_id = auth.uid()
  )
);
create policy "Users can insert own sets" on public.sets for insert with check (
  exists (
    select 1 from public.workout_exercises
    join public.workouts on workouts.id = workout_exercises.workout_id
    where workout_exercises.id = sets.workout_exercise_id and workouts.user_id = auth.uid()
  )
);

-- Set up trigger to automatically create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
