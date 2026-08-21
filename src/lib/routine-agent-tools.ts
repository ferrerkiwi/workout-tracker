import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  addRoutineExercise,
  deleteRoutineExercise,
  moveRoutineExercise,
  replaceRoutineExercise,
  updateRoutineDay,
  updateRoutineExercise,
  type Metric,
} from '@/lib/plan-mutations'
import type { Client } from '@/lib/queries'

const metricSchema = z.enum(['reps', 'time'])

const updateExerciseSchema = z
  .object({
    exercise_id: z.string().uuid(),
    exercise_name: z.string().min(1).max(120).nullable(),
    metric: metricSchema.nullable(),
    target_sets: z.number().int().min(1).max(20).nullable(),
    target_reps: z.number().int().min(1).max(100).nullable(),
    target_seconds: z.number().int().min(1).max(3600).nullable(),
    target_weight: z.number().min(0).max(2000).nullable(),
    notes: z.string().max(500).nullable(),
  })
  .strict()

const replaceExerciseSchema = z
  .object({
    exercise_id: z.string().uuid(),
    exercise_name: z.string().min(1).max(120),
    metric: metricSchema.nullable(),
    target_sets: z.number().int().min(1).max(20).nullable(),
    target_reps: z.number().int().min(1).max(100).nullable(),
    target_seconds: z.number().int().min(1).max(3600).nullable(),
    target_weight: z.number().min(0).max(2000).nullable(),
    notes: z.string().max(500).nullable(),
  })
  .strict()

const addExerciseSchema = z
  .object({
    routine_day_id: z.string().uuid(),
    exercise_name: z.string().min(1).max(120),
    metric: metricSchema,
    target_sets: z.number().int().min(1).max(20),
    target_reps: z.number().int().min(1).max(100).nullable(),
    target_seconds: z.number().int().min(1).max(3600).nullable(),
    target_weight: z.number().min(0).max(2000).nullable(),
    notes: z.string().max(500).nullable(),
    position: z.number().int().min(1).max(50).nullable(),
  })
  .strict()

const removeExerciseSchema = z
  .object({
    exercise_id: z.string().uuid(),
  })
  .strict()

const moveExerciseSchema = z
  .object({
    exercise_id: z.string().uuid(),
    direction: z.enum(['up', 'down']).nullable(),
    position: z.number().int().min(1).max(50).nullable(),
  })
  .strict()

const updateDaySchema = z
  .object({
    routine_day_id: z.string().uuid(),
    name: z.string().min(1).max(80).nullable(),
    is_rest_day: z.boolean().nullable(),
    clear_exercises: z.boolean(),
  })
  .strict()

export type RoutineAgentToolName =
  | 'update_exercise'
  | 'replace_exercise'
  | 'add_exercise'
  | 'remove_exercise'
  | 'move_exercise'
  | 'update_day'

export const routineAgentTools: Anthropic.Tool[] = [
  tool(
    'update_exercise',
    'Update fields on an existing exercise. Use only when the user asks to change sets, reps, seconds, weight, notes, metric, or the exercise name.',
    updateExerciseSchema,
  ),
  tool(
    'replace_exercise',
    'Replace one existing exercise with another while preserving its position unless other fields are changed.',
    replaceExerciseSchema,
  ),
  tool(
    'add_exercise',
    'Add a new exercise to a routine day. If adding to a rest day, the day becomes a training day.',
    addExerciseSchema,
  ),
  tool(
    'remove_exercise',
    'Remove an existing exercise from the routine.',
    removeExerciseSchema,
  ),
  tool(
    'move_exercise',
    'Move an exercise within its current day. Use direction or a 1-based target position.',
    moveExerciseSchema,
  ),
  tool(
    'update_day',
    'Update a routine day name or rest-day state. Set clear_exercises true only when the user asks to make the day a rest day or clear the day.',
    updateDaySchema,
  ),
]

export async function executeRoutineAgentTool(
  supabase: Client,
  name: string,
  input: unknown,
): Promise<{ ok: boolean; message: string; routineChanged: boolean }> {
  const result = await runTool(supabase, name, input)
  if (result.error) {
    return { ok: false, message: result.error, routineChanged: false }
  }

  return {
    ok: true,
    message: successMessage(name as RoutineAgentToolName),
    routineChanged: true,
  }
}

function tool(
  name: RoutineAgentToolName,
  description: string,
  schema: z.ZodType,
): Anthropic.Tool {
  const jsonSchema = toAnthropicToolSchema(z.toJSONSchema(schema))
  delete jsonSchema.$schema

  return {
    name,
    description,
    strict: true,
    input_schema: jsonSchema as Anthropic.Tool.InputSchema,
  }
}

function toAnthropicToolSchema<T>(schema: T): T {
  if (Array.isArray(schema)) {
    return schema.map(toAnthropicToolSchema) as T
  }

  if (!schema || typeof schema !== 'object') return schema

  const unsupportedStrictSchemaKeys = new Set([
    'exclusiveMaximum',
    'exclusiveMinimum',
    'format',
    'maxItems',
    'maxLength',
    'maxProperties',
    'maximum',
    'minItems',
    'minLength',
    'minProperties',
    'minimum',
    'pattern',
    'uniqueItems',
  ])

  const entries = Object.entries(schema)
    .filter(([key]) => !unsupportedStrictSchemaKeys.has(key))
    .map(([key, value]) => [key, toAnthropicToolSchema(value)])

  return Object.fromEntries(entries) as T
}

async function runTool(
  supabase: Client,
  name: string,
  input: unknown,
): Promise<{ error?: string }> {
  switch (name) {
    case 'update_exercise': {
      const parsed = updateExerciseSchema.safeParse(input)
      if (!parsed.success) return { error: 'Tool input was malformed.' }
      const inputData = parsed.data
      const patch = nullablePatch(inputData)
      return updateRoutineExercise(supabase, inputData.exercise_id, patch)
    }
    case 'replace_exercise': {
      const parsed = replaceExerciseSchema.safeParse(input)
      if (!parsed.success) return { error: 'Tool input was malformed.' }
      const inputData = parsed.data
      const patch = nullablePatch(inputData)
      return replaceRoutineExercise(supabase, inputData.exercise_id, {
        ...patch,
        exercise_name: inputData.exercise_name,
      })
    }
    case 'add_exercise': {
      const parsed = addExerciseSchema.safeParse(input)
      if (!parsed.success) return { error: 'Tool input was malformed.' }
      const inputData = parsed.data
      return addRoutineExercise(supabase, inputData.routine_day_id, {
        exercise_name: inputData.exercise_name,
        metric: inputData.metric as Metric,
        target_sets: inputData.target_sets,
        target_reps: inputData.target_reps ?? undefined,
        target_seconds: inputData.target_seconds ?? undefined,
        target_weight: inputData.target_weight,
        notes: inputData.notes,
        position: inputData.position,
      })
    }
    case 'remove_exercise': {
      const parsed = removeExerciseSchema.safeParse(input)
      if (!parsed.success) return { error: 'Tool input was malformed.' }
      return deleteRoutineExercise(supabase, parsed.data.exercise_id)
    }
    case 'move_exercise': {
      const parsed = moveExerciseSchema.safeParse(input)
      if (!parsed.success) return { error: 'Tool input was malformed.' }
      return moveRoutineExercise(supabase, parsed.data.exercise_id, {
        direction: parsed.data.direction ?? undefined,
        position: parsed.data.position,
      })
    }
    case 'update_day': {
      const parsed = updateDaySchema.safeParse(input)
      if (!parsed.success) return { error: 'Tool input was malformed.' }
      return updateRoutineDay(supabase, parsed.data.routine_day_id, {
        name: parsed.data.name ?? undefined,
        is_rest_day: parsed.data.is_rest_day ?? undefined,
        clear_exercises: parsed.data.clear_exercises,
      })
    }
    default:
      return { error: `Unknown tool: ${name}` }
  }
}

function nullablePatch(input: {
  exercise_name?: string | null
  metric?: Metric | null
  target_sets?: number | null
  target_reps?: number | null
  target_seconds?: number | null
  target_weight?: number | null
  notes?: string | null
}) {
  return {
    ...(input.exercise_name !== undefined && input.exercise_name !== null
      ? { exercise_name: input.exercise_name }
      : {}),
    ...(input.metric ? { metric: input.metric } : {}),
    ...(input.target_sets !== undefined && input.target_sets !== null
      ? { target_sets: input.target_sets }
      : {}),
    ...(input.target_reps !== undefined && input.target_reps !== null
      ? { target_reps: input.target_reps }
      : {}),
    ...(input.target_seconds !== undefined
      ? { target_seconds: input.target_seconds }
      : {}),
    ...(input.target_weight !== undefined
      ? { target_weight: input.target_weight }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  }
}

function successMessage(name: RoutineAgentToolName) {
  switch (name) {
    case 'update_exercise':
      return 'Exercise updated.'
    case 'replace_exercise':
      return 'Exercise replaced.'
    case 'add_exercise':
      return 'Exercise added.'
    case 'remove_exercise':
      return 'Exercise removed.'
    case 'move_exercise':
      return 'Exercise moved.'
    case 'update_day':
      return 'Routine day updated.'
  }
}
