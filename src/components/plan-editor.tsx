'use client'

import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Hash,
  Plus,
  Timer,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DAY_NAMES } from '@/lib/constants'
import {
  addExercise,
  deleteExercise,
  moveExercise,
  setDayDetails,
  updateExercise,
} from '@/lib/plan-actions'
import type { Routine, RoutineDay, RoutineExercise } from '@/lib/queries'

type PlanActionResult = { error?: string; data?: RoutineExercise }
type PlanMutation = (
  action: () => Promise<PlanActionResult>,
  optimistic: (current: Routine) => Routine,
  onSuccess?: (
    result: PlanActionResult,
    update: (updater: (current: Routine) => Routine) => void,
  ) => void,
) => Promise<void>

export function PlanEditor({
  routine,
  unit,
}: {
  routine: Routine
  unit: string
}) {
  const [error, setError] = useState<string | null>(null)
  const [plan, setPlan] = useState(routine)
  const writesInFlight = useRef(0)
  // Open the first training day, or — on a freshly cleared week where every
  // day is a rest day — the first day, so there is always something to edit.
  const [open, setOpen] = useState<string | null>(
    routine.routine_days.find((d) => !d.is_rest_day)?.id ??
      routine.routine_days[0]?.id ??
      null,
  )

  // A coach edit or a later navigation can provide a new server snapshot. Do
  // not let an in-flight action response overwrite the local optimistic view.
  useEffect(() => {
    if (writesInFlight.current === 0) setPlan(routine)
  }, [routine])

  const run: PlanMutation = (action, optimistic, onSuccess) => {
    const rollback = plan
    writesInFlight.current += 1
    setError(null)
    setPlan(optimistic)

    return action()
      .then((result) => {
        if (result.error) {
          setPlan(rollback)
          setError(result.error)
          return
        }
        onSuccess?.(result, setPlan)
      })
      .catch(() => {
        setPlan(rollback)
        setError('Could not save that change. Please try again.')
      })
      .finally(() => {
        writesInFlight.current -= 1
      })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {plan.routine_days.map((day) => (
        <DayCard
          key={day.id}
          day={day}
          unit={unit}
          expanded={open === day.id}
          onToggle={() => setOpen((current) => (current === day.id ? null : day.id))}
          run={run}
        />
      ))}
    </div>
  )
}

function DayCard({
  day,
  unit,
  expanded,
  onToggle,
  run,
}: {
  day: RoutineDay
  unit: string
  expanded: boolean
  onToggle: () => void
  run: PlanMutation
}) {
  const [adding, setAdding] = useState(false)
  const [reordering, setReordering] = useState(false)
  const hasPendingExercise = day.routine_exercises.some((exercise) =>
    exercise.id.startsWith('pending-'),
  )

  return (
    <section className="card p-0">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-xs font-semibold text-muted">
            {DAY_NAMES[day.day_of_week].slice(0, 3)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{day.name}</span>
            <span className="block text-xs text-muted">
              {day.is_rest_day
                ? 'Rest day'
                : `${day.routine_exercises.length} exercises`}
            </span>
          </span>
        </button>

        <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={day.is_rest_day}
            onChange={(e) =>
              run(
                () => setDayDetails(day.id, { is_rest_day: e.target.checked }),
                (plan) => updateDayInPlan(plan, day.id, (current) => ({
                  ...current,
                  is_rest_day: e.target.checked,
                })),
              )
            }
            className="size-4 rounded border-edge bg-surface-2 accent-accent"
          />
          Rest
        </label>

        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="text-muted hover:text-foreground"
        >
          {expanded ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-edge p-4">
          <label className="label" htmlFor={`name-${day.id}`}>
            Day name
          </label>
          <input
            id={`name-${day.id}`}
            key={`day-name-${day.name}`}
            defaultValue={day.name}
            className="input mb-4"
            onBlur={(e) => {
              if (e.target.value.trim() === day.name) return
              run(
                () => setDayDetails(day.id, { name: e.target.value }),
                (plan) => updateDayInPlan(plan, day.id, (current) => ({
                  ...current,
                  name: e.target.value.trim(),
                })),
              )
            }}
          />

          {day.routine_exercises.length === 0 ? (
            <p className="mb-4 text-sm text-muted">
              No exercises yet.
            </p>
          ) : (
            <ul className="mb-4 space-y-3">
              {day.routine_exercises.map((exercise, index) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  unit={unit}
                  isFirst={index === 0}
                  isLast={index === day.routine_exercises.length - 1}
                  reordering={reordering}
                  run={run}
                  onMove={(direction) => {
                    setReordering(true)
                    void run(
                      () => moveExercise(exercise.id, direction),
                      (plan) => moveExerciseInPlan(plan, exercise.id, direction),
                    ).finally(() => setReordering(false))
                  }}
                />
              ))}
            </ul>
          )}

          {adding ? (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
              <p className="text-sm font-medium">How is this exercise measured?</p>
              <p className="mt-0.5 text-xs text-muted">
                Reps for countable movements, time for holds and carries.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => {
                    setAdding(false)
                    addOptimistically('reps', day, run)
                  }}
                  disabled={hasPendingExercise}
                  className="btn-ghost h-auto flex-col items-start py-3 text-left"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Hash className="size-4" /> Reps
                  </span>
                  <span className="text-xs font-normal text-muted">
                    e.g. Bench Press, 3 × 10
                  </span>
                </button>
                <button
                  onClick={() => {
                    setAdding(false)
                    addOptimistically('time', day, run)
                  }}
                  disabled={hasPendingExercise}
                  className="btn-ghost h-auto flex-col items-start py-3 text-left"
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Timer className="size-4" /> Time
                  </span>
                  <span className="text-xs font-normal text-muted">
                    e.g. Plank, 3 × 45s
                  </span>
                </button>
              </div>
              <button
                onClick={() => setAdding(false)}
                className="mt-2 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              disabled={hasPendingExercise}
              className="btn-ghost w-full"
            >
              <Plus className="size-4" />
              Add exercise
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function ExerciseRow({
  exercise,
  unit,
  isFirst,
  isLast,
  reordering,
  run,
  onMove,
}: {
  exercise: RoutineExercise
  unit: string
  isFirst: boolean
  isLast: boolean
  reordering: boolean
  run: PlanMutation
  onMove: (direction: 'up' | 'down') => void
}) {
  const isTime = exercise.metric === 'time'
  const isTemporary = exercise.id.startsWith('pending-')

  return (
    <li className="rounded-xl border border-edge bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <GripVertical className="size-4 shrink-0 text-muted" />
        {/* Keyed on the value: these inputs are uncontrolled, so without a
            remount they keep showing stale text after the server data changes
            (e.g. switching metric, or a refresh after any other edit). */}
        <input
          key={`name-${exercise.exercise_name}`}
          defaultValue={exercise.exercise_name}
          disabled={isTemporary}
          aria-label="Exercise name"
          className="input flex-1 px-2.5 py-1.5"
          onBlur={(e) => {
            if (e.target.value.trim() === exercise.exercise_name) return
            run(
              () => updateExercise(exercise.id, { exercise_name: e.target.value }),
              (plan) => updateExerciseInPlan(plan, exercise.id, (current) => ({
                ...current,
                exercise_name: e.target.value.trim(),
              })),
            )
          }}
        />
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => onMove('up')}
            disabled={isTemporary || reordering || isFirst}
            aria-label="Move up"
            className="p-1.5 text-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            onClick={() => onMove('down')}
            disabled={isTemporary || reordering || isLast}
            aria-label="Move down"
            className="p-1.5 text-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            onClick={() =>
              run(
                () => deleteExercise(exercise.id),
                (plan) => removeExerciseFromPlan(plan, exercise.id),
              )
            }
            disabled={isTemporary}
            aria-label="Remove exercise"
            className="p-1.5 text-muted hover:text-danger"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 pl-6">
        <div className="mb-2 inline-flex rounded-lg border border-edge bg-surface p-0.5">
          {(['reps', 'time'] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={isTemporary}
              aria-pressed={isTime === (m === 'time')}
              onClick={() => {
                if (isTime === (m === 'time')) return
                run(
                  () => updateExercise(exercise.id, { metric: m }),
                  (plan) => updateExerciseInPlan(plan, exercise.id, (current) => ({
                    ...current,
                    metric: m,
                    target_seconds: m === 'time' ? 45 : null,
                  })),
                )
              }}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                isTime === (m === 'time')
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {m === 'reps' ? (
                <Hash className="size-3" />
              ) : (
                <Timer className="size-3" />
              )}
              {m === 'reps' ? 'Reps' : 'Time'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <NumberField
            key={`sets-${exercise.target_sets}`}
            label="Sets"
            defaultValue={exercise.target_sets}
            onCommit={(value) => {
              if (value === null) return
              run(
                () => updateExercise(exercise.id, { target_sets: value }),
                (plan) => updateExerciseInPlan(plan, exercise.id, (current) => ({
                  ...current,
                  target_sets: clamp(value, 1, 20),
                })),
              )
            }}
          />
          {isTime ? (
            <NumberField
              // Metric is in the key so flipping units remounts the field
              // rather than leaving the previous unit's number on screen.
              key={`secs-${exercise.target_seconds}`}
              label="Seconds"
              defaultValue={exercise.target_seconds}
              onCommit={(value) => {
                if (value === null) return
                run(
                  () => updateExercise(exercise.id, { target_seconds: value }),
                  (plan) => updateExerciseInPlan(plan, exercise.id, (current) => ({
                    ...current,
                    target_seconds: clamp(value, 1, 3600),
                  })),
                )
              }}
            />
          ) : (
            <NumberField
              key={`reps-${exercise.target_reps}`}
              label="Reps"
              defaultValue={exercise.target_reps}
              onCommit={(value) => {
                if (value === null) return
                run(
                  () => updateExercise(exercise.id, { target_reps: value }),
                  (plan) => updateExerciseInPlan(plan, exercise.id, (current) => ({
                    ...current,
                    target_reps: clamp(value, 1, 100),
                  })),
                )
              }}
            />
          )}
          <NumberField
            key={`weight-${exercise.target_weight}`}
            label={unit}
            defaultValue={exercise.target_weight}
            allowEmpty
            onCommit={(value) =>
              run(
                () => updateExercise(exercise.id, { target_weight: value }),
                (plan) => updateExerciseInPlan(plan, exercise.id, (current) => ({
                  ...current,
                  target_weight: value === null ? null : Math.max(0, value),
                })),
              )
            }
          />
        </div>
      </div>
    </li>
  )
}

function NumberField({
  label,
  defaultValue,
  allowEmpty = false,
  onCommit,
}: {
  label: string
  defaultValue: number | null
  allowEmpty?: boolean
  onCommit: (value: number | null) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={
          label === 'Sets' || label === 'Reps' || label === 'Seconds' ? 1 : 0.5
        }
        defaultValue={defaultValue ?? ''}
        placeholder={allowEmpty ? '—' : undefined}
        className="input no-spin px-2.5 py-1.5 text-center"
        onBlur={(e) => {
          const raw = e.target.value.trim()
          if (raw === '') {
            if (allowEmpty && defaultValue !== null) onCommit(null)
            return
          }
          const parsed = Number(raw)
          if (!Number.isFinite(parsed) || parsed === defaultValue) return
          onCommit(parsed)
        }}
      />
    </label>
  )
}

let pendingExerciseSequence = 0

function addOptimistically(
  metric: 'reps' | 'time',
  day: RoutineDay,
  run: PlanMutation,
) {
  const temporary: RoutineExercise = {
    id: `pending-${Date.now()}-${++pendingExerciseSequence}`,
    order_index: day.routine_exercises.length,
    exercise_name: metric === 'time' ? 'New hold' : 'New exercise',
    metric,
    target_sets: 3,
    target_reps: 10,
    target_seconds: metric === 'time' ? 45 : null,
    target_weight: null,
    rest_seconds: null,
    notes: null,
  }

  run(
    () => addExercise(day.id, metric),
    (plan) =>
      updateDayInPlan(plan, day.id, (current) => ({
        ...current,
        is_rest_day: false,
        routine_exercises: [...current.routine_exercises, temporary],
      })),
    (result, update) => {
      if (!result.data) return
      // Keep the card in place while replacing its temporary local id with the
      // row that Supabase assigned. Follow-up edits then use the real id.
      update((plan) =>
        updateExerciseInPlan(plan, temporary.id, () => result.data!),
      )
    },
  )
}

function updateDayInPlan(
  plan: Routine,
  id: string,
  update: (day: RoutineDay) => RoutineDay,
): Routine {
  return {
    ...plan,
    routine_days: plan.routine_days.map((day) => (day.id === id ? update(day) : day)),
  }
}

function updateExerciseInPlan(
  plan: Routine,
  id: string,
  update: (exercise: RoutineExercise) => RoutineExercise,
): Routine {
  return updateDayInPlan(plan, findExerciseDayId(plan, id), (day) => ({
    ...day,
    routine_exercises: day.routine_exercises.map((exercise) =>
      exercise.id === id ? update(exercise) : exercise,
    ),
  }))
}

function removeExerciseFromPlan(plan: Routine, id: string): Routine {
  return updateDayInPlan(plan, findExerciseDayId(plan, id), (day) => ({
    ...day,
    routine_exercises: reindex(
      day.routine_exercises.filter((exercise) => exercise.id !== id),
    ),
  }))
}

function moveExerciseInPlan(
  plan: Routine,
  exerciseId: string,
  direction: 'up' | 'down',
): Routine {
  const dayId = findExerciseDayId(plan, exerciseId)
  return updateDayInPlan(plan, dayId, (day) => {
    const from = day.routine_exercises.findIndex(
      (exercise) => exercise.id === exerciseId,
    )
    const to = direction === 'up' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= day.routine_exercises.length) return day
    const exercises = [...day.routine_exercises]
    const [exercise] = exercises.splice(from, 1)
    exercises.splice(to, 0, exercise)
    return { ...day, routine_exercises: reindex(exercises) }
  })
}

function findExerciseDayId(plan: Routine, exerciseId: string) {
  return (
    plan.routine_days.find((day) =>
      day.routine_exercises.some((exercise) => exercise.id === exerciseId),
    )?.id ?? ''
  )
}

function reindex(exercises: RoutineExercise[]) {
  return exercises.map((exercise, order_index) => ({ ...exercise, order_index }))
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}
