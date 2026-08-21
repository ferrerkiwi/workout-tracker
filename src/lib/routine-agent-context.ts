import { DAY_NAMES, experienceLabel, goalLabels } from '@/lib/constants'
import {
  formatTarget,
  getPreferences,
  getProfile,
  getRoutineForWeek,
  type Routine,
} from '@/lib/queries'
import type { Client } from '@/lib/queries'
import { startOfWeek, toDateKey, today } from '@/lib/week'

export type RoutineAgentContext = {
  routine: Routine | null
  text: string
}

export async function loadRoutineAgentContext(
  supabase: Client,
  userId: string,
): Promise<RoutineAgentContext> {
  const weekStart = toDateKey(startOfWeek(today()))
  const [profile, preferences, routine] = await Promise.all([
    getProfile(supabase, userId),
    getPreferences(supabase, userId),
    getRoutineForWeek(supabase, userId, weekStart),
  ])

  const unit = profile?.unit_preference ?? 'lbs'
  const preferenceLines = preferences
    ? [
        `Goals: ${goalLabels(preferences.goals) || 'None specified'}`,
        `Experience: ${experienceLabel(preferences.experience_level)}`,
        `Days per week: ${preferences.days_per_week ?? 'not specified'}`,
        `Session length: ${
          preferences.session_length_min === null
            ? 'not specified'
            : `${preferences.session_length_min} min`
        }`,
        `Equipment: ${preferences.equipment.join(', ') || 'None specified'}`,
        `Focus muscles: ${
          preferences.focus_muscles.join(', ') || 'balanced'
        }`,
        `Limitations: ${preferences.limitations || 'None'}`,
      ]
    : ['No preferences saved.']

  const routineLines = routine
    ? routine.routine_days.flatMap((day) => [
        `${DAY_NAMES[day.day_of_week]} (${day.id}): ${day.name} - ${
          day.is_rest_day ? 'Rest day' : 'Training day'
        }`,
        ...day.routine_exercises.map((exercise, index) => {
          const weight =
            exercise.target_weight === null
              ? ''
              : ` @ ${exercise.target_weight} ${unit}`
          const notes = exercise.notes ? ` Notes: ${exercise.notes}` : ''
          return `  ${index + 1}. ${exercise.exercise_name} (${exercise.id}) - ${formatTarget(
            exercise,
          )}${weight}.${notes}`
        }),
        day.routine_exercises.length === 0 ? '  No exercises.' : '',
      ])
    : ['No routine exists for the current week.']

  return {
    routine,
    text: [
      `Current week start: ${weekStart}`,
      `Units: ${unit}`,
      '',
      'User preferences:',
      ...preferenceLines,
      '',
      'Current weekly routine:',
      ...routineLines,
    ].join('\n'),
  }
}
