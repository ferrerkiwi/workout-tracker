'use client'

import { Check, History, Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import {
  discardSession,
  finishSession,
  logSet,
  startSession,
  type LoggedSet,
} from '@/lib/session-actions'
import {
  formatTarget,
  normaliseExerciseName,
  type LastPerformed,
  type LastPerformedMap,
  type RoutineExercise,
} from '@/lib/queries'
import { formatDateLabel } from '@/lib/week'

type SetRow = {
  key: string
  exercise_name: string
  order_index: number
  set_index: number
  isTime: boolean
  /** Reps, or seconds held — whichever the exercise is measured in. */
  amount: string
  weight: string
  completed: boolean
}

/**
 * What to put in the weight box before the user touches it. What they lifted
 * last time beats the generator's guess, which never learns; sets with no
 * counterpart last time inherit that session's heaviest set.
 */
function startingWeight(
  exercise: RoutineExercise,
  setIndex: number,
  last: LastPerformed | undefined,
): string {
  if (last) {
    const previous = last.weights[setIndex] ?? last.lastWeight
    if (previous != null) return String(previous)
  }
  return exercise.target_weight != null ? String(exercise.target_weight) : ''
}

/** "185 lbs · Fri, Aug 7", or a range when the sets were not all the same. */
function lastTimeLabel(
  last: LastPerformed | undefined,
  unit: string,
): string | null {
  if (!last) return null
  const values = Object.values(last.weights)
  if (values.length === 0) return null
  const low = Math.min(...values)
  const high = Math.max(...values)
  const weight = low === high ? `${low}` : `${low}–${high}`
  return `${weight} ${unit} · ${formatDateLabel(last.performed_on)}`
}

function buildRows(
  exercises: RoutineExercise[],
  lastPerformed: LastPerformedMap,
): SetRow[] {
  return exercises.flatMap((exercise) => {
    const isTime = exercise.metric === 'time'
    const last = lastPerformed[normaliseExerciseName(exercise.exercise_name)]
    return Array.from({ length: exercise.target_sets }, (_, i) => ({
      key: `${exercise.id}-${i}`,
      exercise_name: exercise.exercise_name,
      order_index: exercise.order_index,
      set_index: i,
      isTime,
      amount: String(isTime ? (exercise.target_seconds ?? 45) : exercise.target_reps),
      weight: startingWeight(exercise, i, last),
      completed: false,
    }))
  })
}

/** Overlays already-saved sets onto the target-derived rows. */
function hydrate(rows: SetRow[], saved: LoggedSet[]): SetRow[] {
  if (saved.length === 0) return rows
  const byKey = new Map(
    saved.map((s) => [`${s.exercise_name}#${s.set_index}`, s] as const),
  )
  return rows.map((row) => {
    const match = byKey.get(`${row.exercise_name}#${row.set_index}`)
    if (!match) return row
    const saved = row.isTime ? match.seconds : match.reps
    return {
      ...row,
      amount: saved != null ? String(saved) : row.amount,
      weight: match.weight != null ? String(match.weight) : row.weight,
      completed: match.completed,
    }
  })
}

function toNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export function SessionLogger({
  routineDayId,
  dayName,
  exercises,
  unit,
  lastPerformed,
}: {
  routineDayId: string
  dayName: string
  exercises: RoutineExercise[]
  unit: string
  lastPerformed: LastPerformedMap
}) {
  const router = useRouter()
  const [rows, setRows] = useState<SetRow[]>(() =>
    buildRows(exercises, lastPerformed),
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishing, startFinishing] = useTransition()
  const started = useRef(false)
  // Opening the session is a round trip, but the set toggles are live before it
  // lands. Taps made in that window queue here instead of being dropped, and
  // flush as soon as there is an id to write them against.
  const sessionIdRef = useRef<string | null>(null)
  const pending = useRef(new Map<string, SetRow>())

  function write(id: string, row: SetRow) {
    const amount = toNumber(row.amount)
    void logSet(id, {
      exercise_name: row.exercise_name,
      order_index: row.order_index,
      set_index: row.set_index,
      // Only one of these is ever set, which is also what keeps time-based
      // work out of the reps × weight volume total.
      reps: row.isTime ? null : amount,
      seconds: row.isTime ? amount : null,
      weight: toNumber(row.weight),
      completed: row.completed,
    }).then((res) => {
      if (res.error) setError(res.error)
    })
  }

  // Open (or resume) the session once, so every later save has an id and a
  // mid-workout reload restores what was already logged.
  useEffect(() => {
    if (started.current) return
    started.current = true
    startSession(routineDayId).then((result) => {
      if (result.error) {
        setError(result.error)
        return
      }
      if (!result.sessionId) return
      sessionIdRef.current = result.sessionId
      setSessionId(result.sessionId)

      // Anything the user already touched wins over the stored copy, so
      // resuming a session never reverts a tap made while it was loading.
      const saved = result.sets
      if (saved && saved.length > 0) {
        const queued = pending.current
        setRows((prev) =>
          hydrate(
            prev,
            saved.filter(
              (s) => !queued.has(`${s.exercise_name}#${s.set_index}`),
            ),
          ),
        )
      }

      const queued = [...pending.current.values()]
      pending.current.clear()
      for (const row of queued) write(result.sessionId, row)
    })
  }, [routineDayId])

  function persist(row: SetRow) {
    const id = sessionIdRef.current
    if (!id) {
      pending.current.set(`${row.exercise_name}#${row.set_index}`, row)
      return
    }
    write(id, row)
  }

  // The write stays outside the state updater: React can invoke updaters twice
  // in StrictMode, which would double-save every set.
  function update(key: string, patch: Partial<SetRow>, save: boolean) {
    const current = rows.find((row) => row.key === key)
    if (!current) return
    const updated = { ...current, ...patch }
    setRows((prev) => prev.map((row) => (row.key === key ? updated : row)))
    if (save) persist(updated)
  }

  const completedCount = rows.filter((r) => r.completed).length
  // Time-based sets are excluded: seconds × weight is not the same quantity as
  // reps × weight, and adding them together would make the total meaningless.
  const volume = rows
    .filter((r) => r.completed && !r.isTime)
    .reduce((sum, r) => sum + (toNumber(r.amount) ?? 0) * (toNumber(r.weight) ?? 0), 0)
  const heldSeconds = rows
    .filter((r) => r.completed && r.isTime)
    .reduce((sum, r) => sum + (toNumber(r.amount) ?? 0), 0)

  function finish() {
    if (!sessionId) return
    startFinishing(async () => {
      const res = await finishSession(sessionId)
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/dashboard')
      router.refresh()
    })
  }

  function discard() {
    if (!sessionId) {
      router.push('/dashboard')
      return
    }
    startFinishing(async () => {
      await discardSession(sessionId)
      router.push('/dashboard')
      router.refresh()
    })
  }

  // Group rows back into their exercises for rendering.
  const grouped = exercises.map((exercise) => ({
    exercise,
    isTime: exercise.metric === 'time',
    lastLabel: lastTimeLabel(
      lastPerformed[normaliseExerciseName(exercise.exercise_name)],
      unit,
    ),
    rows: rows.filter((r) => r.exercise_name === exercise.exercise_name),
  }))

  return (
    <div className="space-y-5 pb-28">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {grouped.map(({ exercise, isTime, lastLabel, rows: exerciseRows }) => (
        <section key={exercise.id} className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold">{exercise.exercise_name}</h2>
            <span className="shrink-0 text-xs text-muted">
              target {formatTarget(exercise)}
            </span>
          </div>
          {exercise.notes && (
            <p className="mt-1 text-sm text-muted">{exercise.notes}</p>
          )}
          {lastLabel && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
              <History className="size-3" />
              Last time {lastLabel}
            </p>
          )}

          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-2 px-1 text-xs font-medium text-muted uppercase">
              <span>Set</span>
              <span>{isTime ? 'Seconds' : 'Reps'}</span>
              <span>Weight ({unit})</span>
              <span className="text-right">Done</span>
            </div>

            {exerciseRows.map((row) => (
              <div
                key={row.key}
                className={`grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-2 rounded-xl px-1 py-1 transition ${
                  row.completed ? 'bg-accent/5' : ''
                }`}
              >
                <span className="text-sm tabular-nums text-muted">
                  {row.set_index + 1}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`${exercise.exercise_name} set ${row.set_index + 1} ${
                    isTime ? 'seconds' : 'reps'
                  }`}
                  value={row.amount}
                  onChange={(e) => update(row.key, { amount: e.target.value }, false)}
                  onBlur={() => {
                    const current = rows.find((r) => r.key === row.key)
                    if (current) persist(current)
                  }}
                  className="input no-spin px-2.5 py-2 text-center"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  placeholder="—"
                  aria-label={`${exercise.exercise_name} set ${
                    row.set_index + 1
                  } weight`}
                  value={row.weight}
                  onChange={(e) =>
                    update(row.key, { weight: e.target.value }, false)
                  }
                  onBlur={() => {
                    const current = rows.find((r) => r.key === row.key)
                    if (current) persist(current)
                  }}
                  className="input no-spin px-2.5 py-2 text-center"
                />
                <button
                  type="button"
                  aria-label={`Mark set ${row.set_index + 1} complete`}
                  aria-pressed={row.completed}
                  onClick={() =>
                    update(row.key, { completed: !row.completed }, true)
                  }
                  className={`flex size-9 items-center justify-center justify-self-end rounded-lg border transition ${
                    row.completed
                      ? 'border-accent bg-accent text-slate-950'
                      : 'border-edge bg-surface-2 text-muted hover:border-accent/50'
                  }`}
                >
                  <Check className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Sticky action bar, above the mobile nav. */}
      <div className="fixed inset-x-0 bottom-20 z-10 border-t border-edge bg-surface/95 px-4 py-3 backdrop-blur sm:bottom-0 sm:left-[72px]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-medium">
              {completedCount} / {rows.length} sets
            </p>
            <p className="text-muted tabular-nums">
              {Math.round(volume).toLocaleString()} {unit} volume
              {heldSeconds > 0 && ` · ${heldSeconds}s held`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={discard}
              disabled={finishing}
              className="btn-ghost"
              title={`Discard ${dayName}`}
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Discard</span>
            </button>
            <button
              onClick={finish}
              disabled={finishing || !sessionId || completedCount === 0}
              className="btn-primary"
            >
              {finishing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
