import { revalidatePath } from 'next/cache'
import type { TablesUpdate } from '@/lib/database.types'
import type { Client, RoutineExercise } from '@/lib/queries'

export type ActionResult<T = undefined> = { error?: string; data?: T }
export type Metric = 'reps' | 'time'

export type ExercisePatch = {
  exercise_name?: string
  metric?: Metric
  target_sets?: number
  target_reps?: number
  target_seconds?: number | null
  target_weight?: number | null
  notes?: string | null
}

export type AddExerciseInput = {
  exercise_name?: string
  metric?: Metric
  target_sets?: number
  target_reps?: number
  target_seconds?: number | null
  target_weight?: number | null
  notes?: string | null
  position?: number | null
}

export async function addRoutineExercise(
  supabase: Client,
  routineDayId: string,
  input: AddExerciseInput = {},
): Promise<ActionResult<RoutineExercise>> {
  const day = await getRoutineDay(supabase, routineDayId)
  if (!day) return { error: 'Routine day not found.' }

  const exercises = await getDayExercises(supabase, routineDayId)
  const position = normalisePosition(input.position, exercises.length + 1)

  const metric = input.metric ?? 'reps'
  const name = (input.exercise_name ?? '').trim()
  const isTime = metric === 'time'

  const { data: inserted, error } = await supabase
    .from('routine_exercises')
    .insert({
      routine_day_id: routineDayId,
      order_index: exercises.length,
      exercise_name: name || (isTime ? 'New hold' : 'New exercise'),
      metric,
      target_sets: clamp(input.target_sets ?? 3, 1, 20),
      target_reps: clamp(input.target_reps ?? 10, 1, 100),
      target_seconds: isTime
        ? clamp(input.target_seconds ?? 45, 1, 3600)
        : null,
      target_weight:
        input.target_weight === undefined || input.target_weight === null
          ? null
          : Math.max(0, input.target_weight),
      notes: input.notes?.trim() || null,
    })
    .select(
      'id, order_index, exercise_name, metric, target_sets, target_reps, target_seconds, target_weight, rest_seconds, notes',
    )
    .single()
  if (error) return { error: error.message }

  if (position - 1 !== exercises.length) {
    const ordered = [...exercises, inserted]
    const [newExercise] = ordered.splice(exercises.length, 1)
    ordered.splice(position - 1, 0, newExercise)
    const reorderResult = await writeExerciseOrder(supabase, ordered)
    if (reorderResult.error) return { error: reorderResult.error }
  }

  if (day.is_rest_day) {
    const { error: dayError } = await supabase
      .from('routine_days')
      .update({ is_rest_day: false })
      .eq('id', routineDayId)
    if (dayError) return { error: dayError.message }
  }

  revalidatePlan()
  return { data: inserted as RoutineExercise }
}

export async function updateRoutineExercise(
  supabase: Client,
  exerciseId: string,
  patch: ExercisePatch,
): Promise<ActionResult> {
  const clean = cleanExercisePatch(patch)
  if ('error' in clean) return clean
  if (Object.keys(clean).length === 0) return {}

  const { data, error } = await supabase
    .from('routine_exercises')
    .update(clean)
    .eq('id', exerciseId)
    .select('id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Exercise not found.' }

  revalidatePlan()
  return {}
}

export async function replaceRoutineExercise(
  supabase: Client,
  exerciseId: string,
  patch: Omit<ExercisePatch, 'exercise_name'> & { exercise_name: string },
): Promise<ActionResult> {
  return updateRoutineExercise(supabase, exerciseId, patch)
}

export async function deleteRoutineExercise(
  supabase: Client,
  exerciseId: string,
): Promise<ActionResult> {
  const { data, error } = await supabase
    .from('routine_exercises')
    .delete()
    .eq('id', exerciseId)
    .select('id, routine_day_id')
    .maybeSingle()
  if (error) return { error: error.message }
  if (!data) return { error: 'Exercise not found.' }

  const compactResult = await compactExerciseOrder(supabase, data.routine_day_id)
  if (compactResult.error) return compactResult
  revalidatePlan()
  return {}
}

export async function moveRoutineExercise(
  supabase: Client,
  exerciseId: string,
  input: { direction?: 'up' | 'down'; position?: number | null },
): Promise<ActionResult> {
  const { data: current, error } = await supabase
    .from('routine_exercises')
    .select('id, order_index, routine_day_id')
    .eq('id', exerciseId)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!current) return { error: 'Exercise not found.' }

  const exercises = await getDayExercises(supabase, current.routine_day_id)
  const currentIndex = exercises.findIndex((exercise) => exercise.id === exerciseId)
  if (currentIndex === -1) return { error: 'Exercise not found.' }

  let targetIndex: number
  if (input.position !== undefined && input.position !== null) {
    targetIndex = normalisePosition(input.position, exercises.length) - 1
  } else if (input.direction === 'up') {
    targetIndex = Math.max(0, currentIndex - 1)
  } else if (input.direction === 'down') {
    targetIndex = Math.min(exercises.length - 1, currentIndex + 1)
  } else {
    return { error: 'Choose a move direction or target position.' }
  }

  if (targetIndex === currentIndex) return {}

  const [moved] = exercises.splice(currentIndex, 1)
  exercises.splice(targetIndex, 0, moved)

  const reorderResult = await writeExerciseOrder(supabase, exercises)
  if (reorderResult.error) return reorderResult

  revalidatePlan()
  return {}
}

export async function updateRoutineDay(
  supabase: Client,
  routineDayId: string,
  patch: { name?: string; is_rest_day?: boolean; clear_exercises?: boolean },
): Promise<ActionResult> {
  const clean: TablesUpdate<'routine_days'> = {}
  if (patch.name !== undefined) {
    const name = patch.name.trim()
    if (!name) return { error: 'Day name cannot be empty.' }
    clean.name = name
  }
  if (patch.is_rest_day !== undefined) clean.is_rest_day = patch.is_rest_day

  const day = await getRoutineDay(supabase, routineDayId)
  if (!day) return { error: 'Routine day not found.' }

  if (Object.keys(clean).length > 0) {
    const { data, error } = await supabase
      .from('routine_days')
      .update(clean)
      .eq('id', routineDayId)
      .select('id')
      .maybeSingle()
    if (error) return { error: error.message }
    if (!data) return { error: 'Routine day not found.' }
  }

  if (patch.is_rest_day === true && patch.clear_exercises) {
    const { error } = await supabase
      .from('routine_exercises')
      .delete()
      .eq('routine_day_id', routineDayId)
    if (error) return { error: error.message }
  }

  revalidatePlan()
  return {}
}

function cleanExercisePatch(
  patch: ExercisePatch,
): TablesUpdate<'routine_exercises'> | ActionResult {
  const clean: TablesUpdate<'routine_exercises'> = {}
  if (patch.exercise_name !== undefined) {
    const name = patch.exercise_name.trim()
    if (!name) return { error: 'Exercise name cannot be empty.' }
    clean.exercise_name = name
  }

  if (patch.metric !== undefined) {
    clean.metric = patch.metric
    clean.target_seconds =
      patch.metric === 'time' ? clamp(patch.target_seconds ?? 45, 1, 3600) : null
  } else if (patch.target_seconds !== undefined) {
    clean.target_seconds =
      patch.target_seconds === null ? null : clamp(patch.target_seconds, 1, 3600)
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
  if (patch.notes !== undefined) clean.notes = patch.notes?.trim() || null

  return clean
}

async function getRoutineDay(supabase: Client, routineDayId: string) {
  const { data } = await supabase
    .from('routine_days')
    .select('id, is_rest_day')
    .eq('id', routineDayId)
    .maybeSingle()
  return data
}

async function getDayExercises(supabase: Client, routineDayId: string) {
  const { data } = await supabase
    .from('routine_exercises')
    .select('id, order_index')
    .eq('routine_day_id', routineDayId)
    .order('order_index', { ascending: true })
  return data ?? []
}

async function compactExerciseOrder(
  supabase: Client,
  routineDayId: string,
): Promise<ActionResult> {
  const exercises = await getDayExercises(supabase, routineDayId)
  return writeExerciseOrder(supabase, exercises)
}

async function writeExerciseOrder(
  supabase: Client,
  exercises: Array<{ id: string; order_index: number }>,
): Promise<ActionResult> {
  for (const [index, exercise] of exercises.entries()) {
    if (exercise.order_index === index) continue
    const { error } = await supabase
      .from('routine_exercises')
      .update({ order_index: index })
      .eq('id', exercise.id)
    if (error) return { error: error.message }
  }
  return {}
}

function normalisePosition(position: number | null | undefined, max: number) {
  if (!Number.isFinite(position ?? NaN)) return max
  return clamp(position ?? max, 1, max)
}

function revalidatePlan() {
  revalidatePath('/plan')
  revalidatePath('/dashboard')
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}
