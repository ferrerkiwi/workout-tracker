import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { addDays, startOfWeek, toDateKey, today } from '@/lib/week'

export type Client = SupabaseClient<Database>

/** How an exercise is counted: repetitions, or seconds held/worked. */
export type Metric = 'reps' | 'time'

export type RoutineExercise = {
  id: string
  order_index: number
  exercise_name: string
  metric: string
  target_sets: number
  target_reps: number
  target_seconds: number | null
  target_weight: number | null
  rest_seconds: number | null
  notes: string | null
}

/** "3 × 45s" for time-based work, "3 × 10" for reps. */
export function formatTarget(exercise: {
  metric: string
  target_sets: number
  target_reps: number
  target_seconds: number | null
}): string {
  return exercise.metric === 'time'
    ? `${exercise.target_sets} × ${exercise.target_seconds ?? 0}s`
    : `${exercise.target_sets} × ${exercise.target_reps}`
}

export type RoutineDay = {
  id: string
  day_of_week: number
  name: string
  is_rest_day: boolean
  routine_exercises: RoutineExercise[]
}

export type Routine = {
  id: string
  week_start_date: string
  generated_by_model: string | null
  created_at: string
  routine_days: RoutineDay[]
}

const ROUTINE_SELECT = `
  id, week_start_date, generated_by_model, created_at,
  routine_days (
    id, day_of_week, name, is_rest_day,
    routine_exercises (
      id, order_index, exercise_name, metric, target_sets, target_reps,
      target_seconds, target_weight, rest_seconds, notes
    )
  )
` as const

export async function getProfile(supabase: Client, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, unit_preference, onboarded_at')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function getPreferences(supabase: Client, userId: string) {
  const { data } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

/** The routine covering a given week, with days and exercises sorted. */
export async function getRoutineForWeek(
  supabase: Client,
  userId: string,
  weekStart: string,
): Promise<Routine | null> {
  const { data } = await supabase
    .from('routines')
    .select(ROUTINE_SELECT)
    .eq('user_id', userId)
    .eq('week_start_date', weekStart)
    .maybeSingle()

  if (!data) return null
  return sortRoutine(data as unknown as Routine)
}

/** The most recent routine, whichever week it belongs to. */
export async function getLatestRoutine(
  supabase: Client,
  userId: string,
): Promise<Routine | null> {
  const { data } = await supabase
    .from('routines')
    .select(ROUTINE_SELECT)
    .eq('user_id', userId)
    .order('week_start_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return sortRoutine(data as unknown as Routine)
}

function sortRoutine(routine: Routine): Routine {
  const days = [...(routine.routine_days ?? [])].sort(
    (a, b) => a.day_of_week - b.day_of_week,
  )
  for (const day of days) {
    day.routine_exercises = [...(day.routine_exercises ?? [])].sort(
      (a, b) => a.order_index - b.order_index,
    )
  }
  return { ...routine, routine_days: days }
}

/** Routine day plans and completed dates needed to compute the streak. */
export async function getStreakSource(supabase: Client, userId: string) {
  const from = toDateKey(addDays(today(), -200))

  const [{ data: routines }, { data: sessions }] = await Promise.all([
    supabase
      .from('routines')
      // created_at gates retroactive rest days — see computeStreak.
      .select(
        'week_start_date, created_at, routine_days (day_of_week, is_rest_day)',
      )
      .eq('user_id', userId)
      .gte('week_start_date', from),
    supabase
      .from('workout_sessions')
      .select('performed_on')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .gte('performed_on', from),
  ])

  return {
    routines: (routines ?? []) as {
      week_start_date: string
      created_at: string
      routine_days: { day_of_week: number; is_rest_day: boolean }[]
    }[],
    completedDates: new Set((sessions ?? []).map((s) => s.performed_on)),
  }
}

/** Completed sessions in the current Monday-start week. */
export async function getThisWeekSessions(supabase: Client, userId: string) {
  const weekStart = toDateKey(startOfWeek(today()))
  const { data } = await supabase
    .from('workout_sessions')
    .select('id, name, performed_on, total_volume, routine_day_id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('performed_on', weekStart)
    .order('performed_on', { ascending: false })
  return data ?? []
}

/**
 * Exercise names are free text, so "Barbell Bench Press" and "barbell  bench
 * press" must resolve to the same history entry.
 */
export function normaliseExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export type LastPerformed = {
  performed_on: string
  /** Weight actually used, keyed by set index. */
  weights: Record<number, number>
  /** Weight of the highest set index recorded, for sets with no counterpart. */
  lastWeight: number
}

/** Keyed by `normaliseExerciseName`. Plain objects so this crosses to a client component. */
export type LastPerformedMap = Record<string, LastPerformed>

/** How many recent sessions to search for an exercise's last-used weight. */
const HISTORY_WINDOW = 40

/**
 * The weight the user actually lifted the last time they did each exercise —
 * a far better starting point than the generator's guess, which never learns.
 *
 * Only completed sets with a recorded weight count: a set toggled off, or one
 * left blank, is not evidence of anything.
 */
export async function getLastPerformed(
  supabase: Client,
  userId: string,
): Promise<LastPerformedMap> {
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('id, performed_on')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('performed_on', { ascending: false })
    .limit(HISTORY_WINDOW)

  if (!sessions || sessions.length === 0) return {}

  const { data: sets } = await supabase
    .from('session_sets')
    .select('session_id, exercise_name, set_index, weight')
    .in(
      'session_id',
      sessions.map((s) => s.id),
    )
    .eq('completed', true)
    .not('weight', 'is', null)

  if (!sets || sets.length === 0) return {}

  const bySession = new Map<string, typeof sets>()
  for (const set of sets) {
    const bucket = bySession.get(set.session_id)
    if (bucket) bucket.push(set)
    else bySession.set(set.session_id, [set])
  }

  // Sessions are newest first, so the session that first mentions an exercise
  // is the most recent one it was performed in. Tracking which session claimed
  // each exercise keeps two sessions on the same date from merging together.
  const result: LastPerformedMap = {}
  const claimedBy = new Map<string, string>()
  for (const session of sessions) {
    for (const set of bySession.get(session.id) ?? []) {
      const key = normaliseExerciseName(set.exercise_name)
      const owner = claimedBy.get(key)
      if (owner === undefined) {
        claimedBy.set(key, session.id)
        result[key] = {
          performed_on: session.performed_on,
          weights: {},
          lastWeight: 0,
        }
      } else if (owner !== session.id) {
        continue
      }
      result[key].weights[set.set_index] = Number(set.weight)
    }
  }

  for (const entry of Object.values(result)) {
    const indices = Object.keys(entry.weights).map(Number)
    entry.lastWeight = entry.weights[Math.max(...indices)]
  }

  return result
}
