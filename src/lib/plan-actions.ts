'use server'

import { redirect } from 'next/navigation'
import {
  addRoutineExercise,
  deleteRoutineExercise,
  moveRoutineExercise,
  updateRoutineDay,
  updateRoutineExercise,
  type ActionResult,
} from '@/lib/plan-mutations'
import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return supabase
}

/**
 * All writes below are scoped by RLS: routine_exercises and routine_days are
 * only reachable through a routine owned by the signed-in user, so passing a
 * foreign id affects zero rows rather than someone else's plan.
 */

export async function addExercise(
  routineDayId: string,
  metric: 'reps' | 'time' = 'reps',
): Promise<ActionResult> {
  const supabase = await requireUser()
  return addRoutineExercise(supabase, routineDayId, { metric })
}

export async function updateExercise(
  exerciseId: string,
  patch: {
    exercise_name?: string
    metric?: 'reps' | 'time'
    target_sets?: number
    target_reps?: number
    target_seconds?: number
    target_weight?: number | null
    notes?: string | null
  },
): Promise<ActionResult> {
  const supabase = await requireUser()
  return updateRoutineExercise(supabase, exerciseId, patch)
}

export async function deleteExercise(exerciseId: string): Promise<ActionResult> {
  const supabase = await requireUser()
  return deleteRoutineExercise(supabase, exerciseId)
}

/** Swaps an exercise with its neighbour to reorder within a day. */
export async function moveExercise(
  exerciseId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const supabase = await requireUser()
  return moveRoutineExercise(supabase, exerciseId, { direction })
}

export async function setDayDetails(
  routineDayId: string,
  patch: { name?: string; is_rest_day?: boolean },
): Promise<ActionResult> {
  const supabase = await requireUser()
  return updateRoutineDay(supabase, routineDayId, patch)
}
