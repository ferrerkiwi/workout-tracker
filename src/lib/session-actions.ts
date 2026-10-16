'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isScheduledLaterThisWeek, toDateKey, today } from '@/lib/week'
import { validateLoggedSet } from '@/lib/session-validation'
import type { MovementType, WorkoutExercise } from '@/lib/workout-flow'

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
  exercises?: WorkoutExercise[]
}

/**
 * Returns today's in-progress session for a routine day, creating it when the
 * workout is opened. Reusing an open session makes the page safe to
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

  // A workout scheduled for a later weekday cannot be started yet. Checked
  // here rather than only in the UI, so the guard holds however the action is
  // reached.
  const { data: scheduled } = await supabase
    .from('routine_days')
    .select('name, day_of_week, is_rest_day, routines!inner (is_active)')
    .eq('id', routineDayId)
    .eq('routines.is_active', true)
    .maybeSingle<{
      name: string
      day_of_week: number
      is_rest_day: boolean
    }>()

  if (!scheduled) return { error: 'That workout no longer exists.' }
  if (scheduled.is_rest_day) {
    return { error: 'That day is a rest day — there is nothing to log.' }
  }

  if (isScheduledLaterThisWeek(scheduled.day_of_week)) {
    return {
      error: 'That workout is scheduled for a later day this week. ' +
        'You can start it on the day.',
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

    if (created) {
      sessionId = created.id
    } else if (error?.code === '23505') {
      // A second tab can pass the initial lookup before the first tab inserts.
      // The partial unique index turns that race into a safe resume.
      const { data: racedSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('routine_day_id', routineDayId)
        .eq('performed_on', performedOn)
        .is('completed_at', null)
        .maybeSingle()
      if (!racedSession) {
        return { error: 'Could not start the workout. Please try again.' }
      }
      sessionId = racedSession.id
    } else {
      return { error: error?.message ?? 'Could not start the workout.' }
    }
  }

  const { data: snapshot, error: snapshotError } = await supabase.rpc('prepare_workout_exercises', { p_session_id: sessionId })
  if (snapshotError) return { error: snapshotError.message }

  const { data: sets, error: setsError } = await supabase
    .from('session_sets')
    .select(
      'exercise_name, order_index, set_index, reps, seconds, weight, completed',
    )
    .eq('session_id', sessionId)

  if (setsError) return { error: setsError.message }
  return { sessionId, sets: (sets ?? []) as LoggedSet[], exercises: snapshot as unknown as WorkoutExercise[] }
}

/** Saves the result and applies any earned progression in one database transaction. */
export async function completeSet(
  workoutExerciseId: string,
  set: LoggedSet,
  movementType: MovementType | null,
): Promise<{ error?: string; nextWeight?: number | null }> {
  const validationError = validateLoggedSet(set)
  if (validationError) return { error: validationError }
  if (!set.completed || (set.reps === null && set.seconds === null)) {
    return { error: 'Enter your result before saving the set.' }
  }
  if (movementType !== null && movementType !== 'compound' && movementType !== 'isolation') {
    return { error: 'Choose compound or isolation.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data, error } = await supabase.rpc('complete_workout_set', {
    p_workout_exercise_id: workoutExerciseId,
    p_set_index: set.set_index,
    p_reps: set.reps,
    p_seconds: set.seconds,
    p_weight: set.weight,
    p_movement_type: movementType,
  })
  if (error) return { error: error.message }
  revalidatePath('/plan')
  revalidatePath('/dashboard')
  const result = data as { nextWeight: number | null }
  return { nextWeight: result.nextWeight }
}

/** The database locks the session so finishing cannot race a set save. */
export async function finishSession(sessionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { error } = await supabase.rpc('finish_workout', { p_session_id: sessionId })
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/history')
  return {}
}
