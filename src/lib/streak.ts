import { addDays, mondayIndex, startOfWeek, toDateKey, today } from './week'

export type PlanDay = {
  isRest: boolean
  /**
   * `YYYY-MM-DD` the plan was created. A rest day earlier than this was
   * labelled retroactively — the plan did not exist yet on that date — so it
   * cannot count as a day the user followed.
   */
  planCreatedOn: string
}

/**
 * A day's plan, keyed by `YYYY-MM-DD` of the week's Monday and day index.
 * Built from routines + routine_days.
 */
export type PlanLookup = Map<string, PlanDay>

/** Key for the plan lookup: `${weekStart}#${dayIndex}`. */
export function planKey(weekStart: string, dayIndex: number): string {
  return `${weekStart}#${dayIndex}`
}

/** Hard stop so a data gap can never spin this loop forever. */
const MAX_LOOKBACK_DAYS = 730

export type StreakInput = {
  /** `YYYY-MM-DD` for every session with a `completed_at`. */
  completedDates: Set<string>
  /** `${weekStart}#${dayIndex}` -> is_rest_day. Absent = no routine that day. */
  plan: PlanLookup
}

/**
 * Consecutive days ending today where you either completed a workout or the
 * routine scheduled a rest day.
 *
 * Rules:
 *  - A completed session always continues the streak.
 *  - A planned rest day continues it (following the plan is not skipping) —
 *    but only if the plan already existed on that date. Generating a plan
 *    mid-week labels the days before it too, and those must not be credited.
 *  - A scheduled day with no completed session breaks it.
 *  - Today never breaks it — the day isn't over yet — but only counts once
 *    something has actually happened (a session, or a planned rest day).
 *  - A day with no routine covering it stops the walk; we can't tell whether
 *    it was skipped, so we don't guess.
 */
export function computeStreak({ completedDates, plan }: StreakInput): number {
  let streak = 0
  const start = today()

  for (let i = 0; i < MAX_LOOKBACK_DAYS; i++) {
    const date = addDays(start, -i)
    const key = toDateKey(date)
    const weekStart = toDateKey(startOfWeek(date))
    const day = plan.get(planKey(weekStart, mondayIndex(date)))

    // Logged work always counts — it happened, whatever the plan said.
    if (completedDates.has(key)) {
      streak++
      continue
    }
    // A rest day only counts if the plan predates it.
    if (day?.isRest && key >= day.planCreatedOn) {
      streak++
      continue
    }

    // Nothing logged and not a rest day.
    if (i === 0) continue // today is still in progress — skip without breaking
    break // scheduled-but-missed, or no routine data: stop here
  }

  return streak
}

/** Builds the plan lookup from joined routine rows. */
export function buildPlanLookup(
  routines: {
    week_start_date: string
    created_at: string
    routine_days: { day_of_week: number; is_rest_day: boolean }[]
  }[],
): PlanLookup {
  const plan: PlanLookup = new Map()
  for (const routine of routines) {
    // created_at is a timestamp; the streak compares whole days.
    const planCreatedOn = routine.created_at.slice(0, 10)
    for (const day of routine.routine_days ?? []) {
      plan.set(planKey(routine.week_start_date, day.day_of_week), {
        isRest: day.is_rest_day,
        planCreatedOn,
      })
    }
  }
  return plan
}
