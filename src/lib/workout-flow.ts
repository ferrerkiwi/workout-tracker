import type { RoutineExercise } from './queries'

export type MovementType = 'compound' | 'isolation'

export type WorkoutExercise = RoutineExercise & {
  session_id: string
  routine_exercise_id: string | null
  unit: string
  movement_type: MovementType | null
  next_weight: number | null
  progressed_at: string | null
}

/** Unknown names stay unclassified so the lifter can choose the right increase. */
export function inferMovementType(name: string): MovementType | null {
  const normalized = name.toLowerCase().replace(/[-_]/g, ' ')
  if (/\b(curl|fly|flyes|flies|lateral raise|front raise|rear delt raise|leg extension|leg curl|calf raise|pushdown|pressdown|triceps? extension|kickback|shrug|pullover)\b/.test(normalized)) {
    return 'isolation'
  }
  if (/\b(squat|deadlift|bench press|chest press|dumbbell press|incline press|overhead press|shoulder press|military press|push press|leg press|row|rows|pull up|pull ups|pullup|pullups|chin up|chin ups|chinup|chinups|pulldown|lunge|lunges|split squat|step up|step ups|hip thrust|dip|dips|push up|push ups|pushup|pushups)\b/.test(normalized)) {
    return 'compound'
  }
  return null
}

export function progressionIncrement(type: MovementType, unit: string): number {
  const pounds = type === 'compound' ? 10 : 5
  return unit === 'kg' ? Math.round((pounds / 2.2046226218) * 100) / 100 : pounds
}

export function startingWorkoutWeight(
  target: number | null,
): string {
  // A bodyweight plan must not inherit a load from an older workout.
  return target == null ? '' : String(target)
}

export function formatSetElapsed(elapsedMs: number): string {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000))
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}
