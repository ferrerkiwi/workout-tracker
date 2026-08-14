'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TablesUpdate } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export type ActionResult = { error?: string }

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

  const { data: last } = await supabase
    .from('routine_exercises')
    .select('order_index')
    .eq('routine_day_id', routineDayId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isTime = metric === 'time'
  const { error } = await supabase.from('routine_exercises').insert({
    routine_day_id: routineDayId,
    order_index: (last?.order_index ?? -1) + 1,
    exercise_name: isTime ? 'New hold' : 'New exercise',
    metric,
    target_sets: 3,
    // A CHECK constraint ties these to the metric: time needs a duration,
    // reps must leave it null.
    target_reps: 10,
    target_seconds: isTime ? 45 : null,
  })
  if (error) return { error: error.message }

  revalidatePath('/plan')
  return {}
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

  const clean: TablesUpdate<'routine_exercises'> = {}
  if (patch.exercise_name !== undefined) {
    const name = patch.exercise_name.trim()
    if (!name) return { error: 'Exercise name cannot be empty.' }
    clean.exercise_name = name
  }

  // Switching metric must move target_seconds in step, or the CHECK
  // constraint rejects the row.
  if (patch.metric !== undefined) {
    clean.metric = patch.metric
    if (patch.metric === 'time') {
      clean.target_seconds = clamp(patch.target_seconds ?? 45, 1, 3600)
    } else {
      clean.target_seconds = null
    }
  } else if (patch.target_seconds !== undefined) {
    clean.target_seconds = clamp(patch.target_seconds, 1, 3600)
  }

  if (patch.target_sets !== undefined) {
    clean.target_sets = clamp(patch.target_sets, 1, 20)
  }
  if (patch.target_reps !== undefined) {
    clean.target_reps = clamp(patch.target_reps, 1, 100)
  }
  if (patch.target_weight !== undefined) {
    clean.target_weight =
      patch.target_weight === null ? null : Math.max(0, patch.target_weight)
  }
  if (patch.notes !== undefined) clean.notes = patch.notes || null

  if (Object.keys(clean).length === 0) return {}

  const { error } = await supabase
    .from('routine_exercises')
    .update(clean)
    .eq('id', exerciseId)
  if (error) return { error: error.message }

  revalidatePath('/plan')
  return {}
}

export async function deleteExercise(exerciseId: string): Promise<ActionResult> {
  const supabase = await requireUser()
  const { error } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('id', exerciseId)
  if (error) return { error: error.message }

  revalidatePath('/plan')
  return {}
}

/** Swaps an exercise with its neighbour to reorder within a day. */
export async function moveExercise(
  exerciseId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  const supabase = await requireUser()

  const { data: current } = await supabase
    .from('routine_exercises')
    .select('id, order_index, routine_day_id')
    .eq('id', exerciseId)
    .maybeSingle()
  if (!current) return { error: 'Exercise not found.' }

  // Nearest neighbour in the chosen direction: the greatest order_index below
  // it when moving up, the smallest above it when moving down.
  const base = supabase
    .from('routine_exercises')
    .select('id, order_index')
    .eq('routine_day_id', current.routine_day_id)

  const { data: neighbour } =
    direction === 'up'
      ? await base
          .lt('order_index', current.order_index)
          .order('order_index', { ascending: false })
          .limit(1)
          .maybeSingle()
      : await base
          .gt('order_index', current.order_index)
          .order('order_index', { ascending: true })
          .limit(1)
          .maybeSingle()

  if (!neighbour) return {} // already at the end

  const [a, b] = await Promise.all([
    supabase
      .from('routine_exercises')
      .update({ order_index: neighbour.order_index })
      .eq('id', current.id),
    supabase
      .from('routine_exercises')
      .update({ order_index: current.order_index })
      .eq('id', neighbour.id),
  ])
  if (a.error || b.error) {
    return { error: (a.error ?? b.error)?.message ?? 'Could not reorder.' }
  }

  revalidatePath('/plan')
  return {}
}

export async function setDayDetails(
  routineDayId: string,
  patch: { name?: string; is_rest_day?: boolean },
): Promise<ActionResult> {
  const supabase = await requireUser()

  const clean: TablesUpdate<'routine_days'> = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return { error: 'Day name cannot be empty.' }
    clean.name = name
  }
  if (patch.is_rest_day !== undefined) clean.is_rest_day = patch.is_rest_day

  const { error } = await supabase
    .from('routine_days')
    .update(clean)
    .eq('id', routineDayId)
  if (error) return { error: error.message }

  revalidatePath('/plan')
  revalidatePath('/dashboard')
  return {}
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
