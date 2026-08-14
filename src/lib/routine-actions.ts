'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  generatedRoutineSchema,
  normaliseDays,
  type GeneratedRoutine,
} from '@/lib/routine-schema'
import { createClient } from '@/lib/supabase/server'
import { startOfWeek, toDateKey, today } from '@/lib/week'

export type SaveRoutineResult = { error?: string; ok?: boolean }

/**
 * Persists a generated routine for the current week.
 *
 * Regenerating rewrites the week's days and exercises in place rather than
 * deleting the routine, so the plan is never momentarily absent and workouts
 * already logged this week keep pointing at the day they belong to.
 */
export async function saveRoutine(
  input: GeneratedRoutine,
  model: string,
  promptVersion: string,
): Promise<SaveRoutineResult> {
  const parsed = generatedRoutineSchema.safeParse(input)
  if (!parsed.success) return { error: 'That routine is malformed.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const weekStart = toDateKey(startOfWeek(today()))
  const days = normaliseDays(parsed.data.days)

  // The routine and its day rows are reused, never deleted and recreated.
  // Deleting first would leave the user with no plan at all if the insert
  // that follows fails, and would null routine_day_id on every workout
  // already logged this week. Updating in place avoids both.
  const { data: existing } = await supabase
    .from('routines')
    .select('id')
    .eq('user_id', user.id)
    .eq('week_start_date', weekStart)
    .maybeSingle()

  let routineId: string

  if (existing) {
    routineId = existing.id
    const { error } = await supabase
      .from('routines')
      .update({
        generated_by_model: model,
        generation_prompt_version: promptVersion,
      })
      .eq('id', routineId)
    if (error) return { error: error.message }
  } else {
    const { data: created, error } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        week_start_date: weekStart,
        generated_by_model: model,
        generation_prompt_version: promptVersion,
      })
      .select('id')
      .single()
    if (error || !created) {
      return { error: error?.message ?? 'Could not create the routine.' }
    }
    routineId = created.id
  }

  // Unique (routine_id, day_of_week) makes this an update for days that
  // already exist, so their ids — and any session pointing at them — survive.
  const { data: writtenDays, error: daysError } = await supabase
    .from('routine_days')
    .upsert(
      days.map((day) => ({
        routine_id: routineId,
        day_of_week: day.day_of_week,
        name: day.name || (day.is_rest_day ? 'Rest' : 'Workout'),
        is_rest_day: day.is_rest_day,
      })),
      { onConflict: 'routine_id,day_of_week' },
    )
    .select('id, day_of_week')
  if (daysError || !writtenDays) {
    return { error: daysError?.message ?? 'Could not write the training days.' }
  }

  // Swap the exercises only, now that the days themselves are settled.
  const { error: clearError } = await supabase
    .from('routine_exercises')
    .delete()
    .in(
      'routine_day_id',
      writtenDays.map((d) => d.id),
    )
  if (clearError) return { error: clearError.message }

  const dayIdByIndex = new Map(
    writtenDays.map((d) => [d.day_of_week, d.id] as const),
  )

  const exerciseRows = days.flatMap((day) => {
    const dayId = dayIdByIndex.get(day.day_of_week)
    if (!dayId || day.is_rest_day) return []
    return day.exercises.map((exercise, index) => {
      const isTime = exercise.metric === 'time'
      return {
        routine_day_id: dayId,
        order_index: index,
        exercise_name: exercise.name,
        metric: isTime ? 'time' : 'reps',
        target_sets: clamp(exercise.sets, 1, 20),
        target_reps: clamp(exercise.reps, 1, 100),
        // The DB requires a duration for time and none for reps, so fall back
        // to a sane hold rather than rejecting the whole routine if the model
        // omits it.
        target_seconds: isTime
          ? clamp(exercise.duration_seconds ?? 45, 1, 3600)
          : null,
        target_weight: exercise.suggested_weight,
        rest_seconds: clamp(exercise.rest_seconds, 0, 900),
        notes: exercise.notes?.trim() || null,
      }
    })
  })

  if (exerciseRows.length > 0) {
    const { error: exerciseError } = await supabase
      .from('routine_exercises')
      .insert(exerciseRows)
    if (exerciseError) return { error: exerciseError.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/plan')
  return { ok: true }
}

/**
 * Ensures this week has a routine with seven empty rest days.
 *
 * Backs both "build my own" (no routine yet) and "clear plan" (wipe an
 * existing one). Days are reused rather than recreated where possible, so any
 * workout already logged this week keeps its link to the day it belongs to.
 * Completed sessions are never touched.
 */
export async function resetPlanToEmpty(): Promise<SaveRoutineResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const weekStart = toDateKey(startOfWeek(today()))

  const { data: existing } = await supabase
    .from('routines')
    .select('id')
    .eq('user_id', user.id)
    .eq('week_start_date', weekStart)
    .maybeSingle()

  let routineId = existing?.id

  if (!routineId) {
    const { data: created, error } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        week_start_date: weekStart,
        generated_by_model: null,
      })
      .select('id')
      .single()
    if (error || !created) {
      return { error: error?.message ?? 'Could not create the plan.' }
    }
    routineId = created.id

    const { error: daysError } = await supabase.from('routine_days').insert(
      Array.from({ length: 7 }, (_, day_of_week) => ({
        routine_id: routineId!,
        day_of_week,
        name: 'Rest',
        is_rest_day: true,
      })),
    )
    if (daysError) return { error: daysError.message }
  } else {
    const { data: days } = await supabase
      .from('routine_days')
      .select('id')
      .eq('routine_id', routineId)

    if (days && days.length > 0) {
      const { error: exError } = await supabase
        .from('routine_exercises')
        .delete()
        .in(
          'routine_day_id',
          days.map((d) => d.id),
        )
      if (exError) return { error: exError.message }
    }

    const { error: dayError } = await supabase
      .from('routine_days')
      .update({ is_rest_day: true, name: 'Rest' })
      .eq('routine_id', routineId)
    if (dayError) return { error: dayError.message }

    const { error: metaError } = await supabase
      .from('routines')
      .update({ generated_by_model: null, generation_prompt_version: null })
      .eq('id', routineId)
    if (metaError) return { error: metaError.message }
  }

  revalidatePath('/plan')
  revalidatePath('/dashboard')
  return { ok: true }
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
