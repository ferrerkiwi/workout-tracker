import { z } from 'zod'

/**
 * Shape the model must return.
 *
 * Structured outputs require every property to be present, so optional values
 * are `.nullable()` rather than `.optional()`. Array-length constraints are
 * deliberately omitted — they are not enforceable in the JSON Schema the API
 * accepts, so the day count is normalised server-side instead.
 */
export const generatedExerciseSchema = z.object({
  name: z.string().describe('Exercise name, e.g. "Barbell Bench Press".'),
  metric: z
    .enum(['reps', 'time'])
    .describe(
      'Use "time" for holds and carries measured in seconds (plank, dead ' +
        'hang, farmer\'s carry, wall sit). Use "reps" for everything else.',
    ),
  sets: z.number().int().describe('Number of working sets, 1-8.'),
  reps: z
    .number()
    .int()
    .describe('Target reps per set, 1-50. Ignored when metric is "time".'),
  duration_seconds: z
    .number()
    .int()
    .nullable()
    .describe(
      'Seconds held or worked per set when metric is "time" (typically ' +
        '20-120). Null when metric is "reps".',
    ),
  suggested_weight: z
    .number()
    .nullable()
    .describe(
      "Starting weight in the user's units. Always null for a beginner, " +
        'for bodyweight movements, and anywhere a number would be a guess.',
    ),
  rest_seconds: z.number().int().describe('Rest between sets, 30-300.'),
  notes: z
    .string()
    .describe('Short cue or tempo note. Empty string if nothing useful.'),
})

export const generatedDaySchema = z.object({
  day_of_week: z
    .number()
    .int()
    .describe('0 = Monday, 1 = Tuesday, … 6 = Sunday.'),
  name: z
    .string()
    .describe('Short title, e.g. "Push A", "Lower Body", or "Rest".'),
  is_rest_day: z.boolean(),
  exercises: z
    .array(generatedExerciseSchema)
    .describe('Empty array on rest days.'),
})

export const generatedRoutineSchema = z.object({
  days: z
    .array(generatedDaySchema)
    .describe('Exactly seven entries, one per day, day_of_week 0 through 6.'),
  summary: z
    .string()
    .describe('One or two sentences explaining the structure of the week.'),
})

export type GeneratedRoutine = z.infer<typeof generatedRoutineSchema>
export type GeneratedDay = z.infer<typeof generatedDaySchema>

/**
 * Guarantees exactly seven days, indexed 0-6, sorted, with duplicates dropped
 * and gaps filled as rest days. The model is asked for this shape but the
 * database depends on it, so we enforce it rather than trust it.
 */
export function normaliseDays(days: GeneratedDay[]): GeneratedDay[] {
  const byIndex = new Map<number, GeneratedDay>()

  for (const day of days) {
    const index = Number(day.day_of_week)
    if (!Number.isInteger(index) || index < 0 || index > 6) continue
    if (byIndex.has(index)) continue
    byIndex.set(index, {
      ...day,
      day_of_week: index,
      exercises: day.is_rest_day ? [] : (day.exercises ?? []),
    })
  }

  return Array.from({ length: 7 }, (_, index) => {
    const day = byIndex.get(index)
    if (day) return day
    return {
      day_of_week: index,
      name: 'Rest',
      is_rest_day: true,
      exercises: [],
    }
  })
}
