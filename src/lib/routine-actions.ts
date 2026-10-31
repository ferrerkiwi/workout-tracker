'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  routineInputSchema,
  normaliseDays,
  type GeneratedRoutine,
} from '@/lib/routine-schema'
import type { Json } from '@/lib/database.types'
import { createClient } from '@/lib/supabase/server'

export type SaveRoutineResult = { error?: string; ok?: boolean }

/**
 * Persists the generated routine as the user's active recurring plan.
 *
 * Regenerating rewrites the week's days and exercises in place rather than
 * deleting the routine, so the plan is never momentarily absent and logged
 * workouts keep pointing at the day they belong to.
 */
export async function saveRoutine(
  input: GeneratedRoutine,
  model: string,
  promptVersion: string,
): Promise<SaveRoutineResult> {
  const parsed = routineInputSchema.safeParse(input)
  if (!parsed.success) return { error: 'That routine is malformed.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const days = normaliseDays(parsed.data.days)

  // The database function performs the routine/day/exercise rewrite in one
  // transaction, so a failed exercise insert cannot leave the active plan
  // half-empty.
  const { error } = await supabase.rpc('save_active_routine', {
    p_days: days as unknown as Json,
    p_generated_by_model: model,
    p_generation_prompt_version: promptVersion,
  })
  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/plan')
  return { ok: true }
}

/**
 * Ensures the active plan has seven empty rest days.
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

  const { error } = await supabase.rpc('reset_active_plan_to_empty')
  if (error) return { error: error.message }

  revalidatePath('/plan')
  revalidatePath('/dashboard')
  return { ok: true }
}
