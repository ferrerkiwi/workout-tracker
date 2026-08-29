export type SessionSetInput = {
  exercise_name: string
  order_index: number
  set_index: number
  reps: number | null
  seconds: number | null
  weight: number | null
  completed: boolean
}

const MAX_EXERCISE_NAME_LENGTH = 120
const MAX_SET_INDEX = 99
const MAX_REPS = 1_000
const MAX_SECONDS = 3_600
const MAX_WEIGHT = 5_000

/**
 * Server Actions are callable from the browser, so keep the same invariants
 * enforced by the UI at this boundary as well as in the database.
 */
export function validateLoggedSet(set: SessionSetInput): string | null {
  if (
    typeof set.exercise_name !== 'string' ||
    set.exercise_name.trim().length === 0 ||
    set.exercise_name.trim().length > MAX_EXERCISE_NAME_LENGTH
  ) {
    return 'Exercise name must be between 1 and 120 characters.'
  }

  if (!isWholeNumberInRange(set.order_index, 0, MAX_SET_INDEX)) {
    return 'Exercise order is invalid.'
  }
  if (!isWholeNumberInRange(set.set_index, 0, MAX_SET_INDEX)) {
    return 'Set number is invalid.'
  }
  if (typeof set.completed !== 'boolean') return 'Set completion is invalid.'
  if (set.reps !== null && set.seconds !== null) {
    return 'A set cannot record both reps and seconds.'
  }
  if (set.reps !== null && !isWholeNumberInRange(set.reps, 0, MAX_REPS)) {
    return 'Reps must be a whole number between 0 and 1000.'
  }
  if (set.seconds !== null && !isWholeNumberInRange(set.seconds, 0, MAX_SECONDS)) {
    return 'Seconds must be a whole number between 0 and 3600.'
  }
  if (set.weight !== null && !isNumberInRange(set.weight, 0, MAX_WEIGHT)) {
    return 'Weight must be between 0 and 5000.'
  }

  return null
}

function isWholeNumberInRange(value: number, min: number, max: number) {
  return Number.isInteger(value) && value >= min && value <= max
}

function isNumberInRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max
}
