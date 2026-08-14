'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  dateForRoutineDay,
  isFuture,
  relativeDayLabel,
  toDateKey,
  today,
} from '@/lib/week'

export type LoggedSet = {
  exercise_name: string
  order_index: number
  set_index: number
  /** Set for rep-based work; null when the exercise is measured in time. */
  reps: number | null
  /** Set for time-based work; null when the exercise is measured in reps. */
  seconds: number | null
  weight: number | null
  completed: boolean
}

export type StartSessionResult = {
  error?: string
  sessionId?: string
  sets?: LoggedSet[]
}

/**
 * Returns today's in-progress session for a routine day, creating it if this
 * is the first set logged. Reusing an open session makes the page safe to
 * reload mid-workout.
 */
export async function startSession(
  routineDayId: string,
): Promise<StartSessionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const performedOn = toDateKey(today())

  // A workout scheduled for a later date cannot be started yet. Checked here
  // rather than only in the UI, so the guard holds however the action is
  // reached.
  const { data: scheduled } = await supabase
    .from('routine_days')
    .select('name, day_of_week, is_rest_day, routines (week_start_date)')
    .eq('id', routineDayId)
    .maybeSingle<{
      name: string
      day_of_week: number
      is_rest_day: boolean
      routines: { week_start_date: string } | null
    }>()

  if (!scheduled) return { error: 'That workout no longer exists.' }
  if (scheduled.is_rest_day) {
    return { error: 'That day is a rest day — there is nothing to log.' }
  }

  if (scheduled.routines) {
    const when = dateForRoutineDay(
      scheduled.routines.week_start_date,
      scheduled.day_of_week,
    )
    if (isFuture(when)) {
      return {
        error: `That workout is scheduled for ${relativeDayLabel(when)}. ` +
          'You can start it on the day.',
      }
    }
  }

  const { data: existing } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('routine_day_id', routineDayId)
    .eq('performed_on', performedOn)
    .is('completed_at', null)
    .maybeSingle()

  let sessionId = existing?.id

  if (!sessionId) {
    const day = scheduled

    const { data: created, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        routine_day_id: routineDayId,
        // Denormalised so history survives a routine being regenerated.
        name: day?.name ?? 'Workout',
        performed_on: performedOn,
      })
      .select('id')
      .single()

    if (error || !created) {
      return { error: error?.message ?? 'Could not start the workout.' }
    }
    sessionId = created.id
  }

  const { data: sets } = await supabase
    .from('session_sets')
    .select(
      'exercise_name, order_index, set_index, reps, seconds, weight, completed',
    )
    .eq('session_id', sessionId)

  return { sessionId, sets: (sets ?? []) as LoggedSet[] }
}

/** Writes a single set. Called as the user checks sets off. */
export async function logSet(
  sessionId: string,
  set: LoggedSet,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS restricts session_sets to the owner's sessions, so a forged
  // sessionId cannot write here.
  const { error } = await supabase.from('session_sets').upsert(
    {
      session_id: sessionId,
      exercise_name: set.exercise_name,
      order_index: set.order_index,
      set_index: set.set_index,
      reps: set.reps,
      seconds: set.seconds,
      weight: set.weight,
      completed: set.completed,
    },
    { onConflict: 'session_id,exercise_name,set_index' },
  )

  return error ? { error: error.message } : {}
}

/**
 * Completes a session and stores its total volume.
 *
 * Volume is recomputed from the stored sets rather than trusting a number
 * from the client, and counts only sets actually checked off. Bodyweight sets
 * (null weight) contribute zero.
 */
export async function finishSession(
  sessionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sets, error: setsError } = await supabase
    .from('session_sets')
    .select('reps, weight, completed')
    .eq('session_id', sessionId)
  if (setsError) return { error: setsError.message }

  const totalVolume = (sets ?? [])
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.reps ?? 0) * Number(s.weight ?? 0), 0)

  const { error } = await supabase
    .from('workout_sessions')
    .update({
      completed_at: new Date().toISOString(),
      total_volume: Math.round(totalVolume * 100) / 100,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/history')
  return {}
}

/** Abandons an in-progress session and its logged sets. */
export async function discardSession(
  sessionId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .is('completed_at', null)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return {}
}
