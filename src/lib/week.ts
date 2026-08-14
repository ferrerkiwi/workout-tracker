/**
 * Date helpers.
 *
 * Everything is computed in the runtime's local timezone and stored as a
 * `YYYY-MM-DD` string, matching the `date` columns in Postgres. Using
 * `toISOString()` here would shift the day for anyone west of UTC, so we
 * format from the local parts instead.
 */

/** `YYYY-MM-DD` for a Date, in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parses `YYYY-MM-DD` as a local-midnight Date (not UTC). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 0 = Monday … 6 = Sunday, matching `routine_days.day_of_week`. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** Local midnight on the Monday of that date's week. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - mondayIndex(d))
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

/** Today at local midnight. */
export function today(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** The calendar date a routine day falls on, from its week's Monday. */
export function dateForRoutineDay(weekStart: string, dayOfWeek: number): Date {
  return addDays(fromDateKey(weekStart), dayOfWeek)
}

/** True when the date is later than today. Compares day keys, not clock time. */
export function isFuture(date: Date): boolean {
  return toDateKey(date) > toDateKey(today())
}

/** "tomorrow", "Saturday", or a full date if it is further out. */
export function relativeDayLabel(date: Date): string {
  const diff = Math.round(
    (fromDateKey(toDateKey(date)).getTime() - today().getTime()) / 86_400_000,
  )
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatVolume(volume: number, unit: string): string {
  const rounded = Math.round(volume)
  return `${rounded.toLocaleString()} ${unit}`
}

export function formatDateLabel(key: string): string {
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
