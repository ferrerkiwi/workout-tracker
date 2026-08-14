/**
 * Training goals. Multi-select — there is deliberately no "general fitness"
 * option, since selecting everything already says exactly that.
 */
export const GOALS = [
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'get_stronger', label: 'Get stronger' },
  { value: 'lose_fat', label: 'Lose fat' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'athleticism', label: 'Athleticism' },
  { value: 'mobility', label: 'Mobility' },
] as const

/**
 * At or above this many goals, the user is saying they have no single
 * priority — which the generator treats as general fitness rather than
 * stacking every adaptation into every session.
 */
export const GENERAL_FITNESS_THRESHOLD = 4

export const GOAL_VALUES = GOALS.map((g) => g.value) as readonly string[]

export const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', hint: 'Under a year of consistent training' },
  { value: 'intermediate', label: 'Intermediate', hint: 'One to three years' },
  { value: 'advanced', label: 'Advanced', hint: 'Three or more years' },
] as const

export const EQUIPMENT = [
  'Barbell',
  'Dumbbells',
  'Kettlebells',
  'Cable machine',
  'Machines',
  'Pull-up bar',
  'Dip bars',
  'Resistance bands',
  'Bodyweight only',
] as const

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
] as const

/** Index 0 = Monday, matching `routine_days.day_of_week`. */
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function goalLabel(value: string) {
  return GOALS.find((g) => g.value === value)?.label ?? value
}

/** "Build muscle, Athleticism" — for prompts and summaries. */
export function goalLabels(values: readonly string[]) {
  return values.map(goalLabel).join(', ')
}

export function experienceLabel(value: string) {
  return EXPERIENCE_LEVELS.find((e) => e.value === value)?.label ?? value
}
