'use client'

import { ArrowLeft, Check, Loader2, Play, Timer } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { completeSet, finishSession, startSession, type LoggedSet } from '@/lib/session-actions'
import { formatTarget, type RoutineExercise } from '@/lib/queries'
import { formatSetElapsed, inferMovementType, progressionIncrement, startingWorkoutWeight, type MovementType, type WorkoutExercise } from '@/lib/workout-flow'

const GuidedSet = dynamic(() => import('@/components/guided-set').then((module) => module.GuidedSet), { ssr: false })

type SetRow = { key: string; exerciseId: string; setIndex: number; amount: string; weight: string; completed: boolean }
type Screen = { step: 'list' } | { step: 'prepare' | 'running' | 'result'; key: string }

function buildRows(exercises: WorkoutExercise[], saved: LoggedSet[]): SetRow[] {
  return exercises.flatMap((exercise) => {
    return Array.from({ length: exercise.target_sets }, (_, setIndex) => {
      const stored = saved.find((set) => set.exercise_name === exercise.exercise_name && set.order_index === exercise.order_index && set.set_index === setIndex)
      return {
        key: `${exercise.id}-${setIndex}`, exerciseId: exercise.id, setIndex,
        amount: String(stored ? (exercise.metric === 'time' ? stored.seconds : stored.reps) ?? '' : exercise.metric === 'time' ? exercise.target_seconds ?? 45 : exercise.target_reps),
        weight: stored ? (stored.weight == null ? '' : String(stored.weight)) : startingWorkoutWeight(exercise.target_weight),
        completed: stored?.completed ?? false,
      }
    })
  })
}

function SetTimer({ onFinish, onTempo, canUseTempo }: {
  onFinish: (elapsedMs: number) => void; onTempo: () => void; canUseTempo: boolean
}) {
  const startedAt = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    startedAt.current ??= performance.now()
    const timer = window.setInterval(() => setElapsed(performance.now() - startedAt.current!), 200)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="py-8 text-center sm:py-14">
      <p className="text-sm font-medium text-muted">Set in progress</p>
      <p className="my-8 text-7xl font-bold tabular-nums sm:text-8xl" role="timer" aria-label="Time spent on this set">{formatSetElapsed(elapsed)}</p>
      <div className="mx-auto flex max-w-sm flex-col gap-3">
        {canUseTempo && <button type="button" className="btn-ghost min-h-14 border border-edge" onClick={onTempo}><Timer className="size-5" />Use tempo</button>}
        <button type="button" className="btn-primary min-h-14" onClick={() => onFinish(performance.now() - (startedAt.current ?? performance.now()))}><Check className="size-5" />Finish set</button>
      </div>
    </div>
  )
}

function RestTimer({ startedAt, suggestedSeconds }: { startedAt: number; suggestedSeconds: number | null }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(performance.now() - startedAt), 200)
    return () => window.clearInterval(timer)
  }, [startedAt])
  return (
    <div className="rounded-lg bg-surface-2 p-5 text-center">
      <p className="text-sm font-medium text-muted">Rest time</p>
      <p className="mt-2 text-4xl font-bold tabular-nums" role="timer" aria-label="Rest time since finishing this set">{formatSetElapsed(elapsed)}</p>
      {suggestedSeconds != null && <p className="mt-2 text-sm text-muted">Suggested rest: {formatSetElapsed(suggestedSeconds * 1000)}</p>}
    </div>
  )
}

export function SessionLogger({ routineDayId, dayName, exercises: planExercises, unit: profileUnit }: {
  routineDayId: string; dayName: string; exercises: RoutineExercise[]; unit: string
}) {
  const router = useRouter()
  const [exercises, setExercises] = useState<WorkoutExercise[]>([])
  const [rows, setRows] = useState<SetRow[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>({ step: 'list' })
  const [movementTypes, setMovementTypes] = useState<Record<string, MovementType | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tempoOpen, setTempoOpen] = useState(false)
  const [actualAmount, setActualAmount] = useState('')
  const [restStartedAt, setRestStartedAt] = useState(0)
  const [loadAttempt, setLoadAttempt] = useState(0)
  // Cover the interval before React paints a disabled save button.
  const saving = useRef(false)
  const unit = exercises[0]?.unit ?? profileUnit

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await startSession(routineDayId)
        if (!active) return
        if (result.error || !result.sessionId || !result.exercises) {
          setError(result.error ?? 'Could not open this workout.')
          return
        }
        setSessionId(result.sessionId)
        setExercises(result.exercises)
        setRows(buildRows(result.exercises, result.sets ?? []))
        setMovementTypes(Object.fromEntries(result.exercises.map((exercise) => [exercise.id, exercise.movement_type ?? inferMovementType(exercise.exercise_name)])))
      } catch {
        if (active) setError('Could not open the workout. Check your connection and try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [routineDayId, loadAttempt])

  const row = screen.step === 'list' ? null : rows.find((entry) => entry.key === screen.key) ?? null
  const exercise = row ? exercises.find((entry) => entry.id === row.exerciseId) ?? null : null
  const nextRow = row ? rows.find((entry) => entry.exerciseId === row.exerciseId && entry.key !== row.key && !entry.completed) : null
  const completedCount = rows.filter((entry) => entry.completed).length

  function openExercise(selected: WorkoutExercise) {
    const next = rows.find((entry) => entry.exerciseId === selected.id && !entry.completed)
    if (next) { setError(null); setScreen({ step: 'prepare', key: next.key }) }
  }

  function finishSet(elapsedMs?: number, tempoReps?: number) {
    if (!row || !exercise) return
    setRestStartedAt(performance.now())
    setTempoOpen(false)
    setActualAmount(exercise.metric === 'time' ? String(Math.min(3600, Math.floor((elapsedMs ?? 0) / 1000))) : tempoReps == null ? '' : String(tempoReps))
    setError(null)
    setScreen({ step: 'result', key: row.key })
  }

  function validateWeight() {
    const weight = row?.weight.trim() ? Number(row.weight) : null
    if (weight !== null && (!Number.isFinite(weight) || weight < 0 || weight > 5000)) return 'Enter a weight between 0 and 5000, or leave it blank for bodyweight.'
    if (exercise?.metric === 'reps' && weight !== null && weight > 0 && !movementTypes[exercise.id]) return 'Choose compound or isolation before starting.'
    return null
  }

  async function saveResult() {
    if (!row || !exercise || saving.current) return
    const amount = actualAmount.trim() === '' ? NaN : Number(actualAmount)
    const maximum = exercise.metric === 'time' ? 3600 : 1000
    if (!Number.isInteger(amount) || amount < 0 || amount > maximum) { setError(`Enter a whole number between 0 and ${maximum}.`); return }
    const weightError = validateWeight()
    if (weightError) { setError(weightError); return }
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await completeSet(exercise.id, {
        exercise_name: exercise.exercise_name, order_index: exercise.order_index, set_index: row.setIndex,
        reps: exercise.metric === 'reps' ? amount : null,
        seconds: exercise.metric === 'time' ? amount : null,
        weight: row.weight.trim() === '' ? null : Number(row.weight), completed: true,
      }, movementTypes[exercise.id] ?? null)
      if (result.error) { setError(result.error); return }
      setRows((previous) => previous.map((entry) => entry.key === row.key
        ? { ...entry, amount: String(amount), completed: true }
        : entry))
      if (result.nextWeight != null) setExercises((previous) => previous.map((entry) => entry.id === exercise.id ? { ...entry, next_weight: result.nextWeight! } : entry))
      const next = rows.find((entry) => entry.exerciseId === exercise.id && entry.key !== row.key && !entry.completed)
      setScreen(next ? { step: 'running', key: next.key } : { step: 'list' })
    } catch {
      setError('Could not save the set. Your result is still here; try saving again.')
    } finally { saving.current = false; setBusy(false) }
  }

  async function finishWorkout() {
    if (!sessionId || saving.current) return
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const result = await finishSession(sessionId)
      if (result.error) { setError(result.error); return }
      router.push('/dashboard')
      router.refresh()
    } catch { setError('Could not finish the workout. Please try again.') }
    finally { saving.current = false; setBusy(false) }
  }

  if (loading) return <div className="card flex items-center gap-3" role="status"><Loader2 className="size-5 animate-spin" />Opening your {planExercises.length} exercises…</div>

  return (
    <div className={`space-y-5 ${screen.step === 'list' ? 'pb-32' : 'pb-8'}`}>
      {error && <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      {!sessionId ? <button className="btn-primary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry opening workout</button> : screen.step === 'list' ? (
        <>
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Your exercises</h2><span className="text-sm text-muted">{completedCount} / {rows.length} sets done</span></div>
          {exercises.map((entry) => {
            const done = rows.filter((item) => item.exerciseId === entry.id && item.completed).length
            const complete = done === entry.target_sets
            return (
              <section key={entry.id} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0"><h3 className="text-lg font-semibold">{entry.exercise_name}</h3><p className="mt-1 text-sm text-muted">{formatTarget(entry)} · {done} / {entry.target_sets} sets done</p></div>
                  <button type="button" className={complete ? 'btn-ghost shrink-0' : 'btn-primary shrink-0'} disabled={complete || busy} onClick={() => openExercise(entry)} aria-label={`${complete ? 'Completed' : 'Start'} ${entry.exercise_name}`}>
                    {complete ? <Check className="size-4" /> : <Play className="size-4" />}{complete ? 'Done' : 'Start'}
                  </button>
                </div>
                {entry.next_weight != null && <p className="mt-3 text-sm font-medium text-accent" role="status">All rep targets met. Your plan is now {entry.next_weight} {unit} for next time.</p>}
                {complete && entry.next_weight == null && <p className="mt-3 text-sm text-muted">Exercise complete. Plan weight unchanged.</p>}
              </section>
            )
          })}
          <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 border-t border-edge bg-surface px-4 py-3 sm:bottom-0 sm:left-[72px]">
            <div className="mx-auto max-w-3xl">
              <button type="button" className="btn-primary min-h-12 w-full" disabled={busy || completedCount === 0} onClick={() => void finishWorkout()}>{busy ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}Finish workout</button>
              {completedCount > 0 && completedCount < rows.length && <p className="mt-2 text-center text-xs text-muted">You can finish early. Only completed sets will be recorded in history.</p>}
            </div>
          </div>
        </>
      ) : row && exercise ? (
        <section className="card">
          {screen.step === 'prepare' && <button type="button" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground" onClick={() => { setError(null); setScreen({ step: 'list' }) }}><ArrowLeft className="size-4" />All exercises</button>}
          <p className="text-sm font-medium text-accent">{dayName} · Set {row.setIndex + 1} of {exercise.target_sets}</p>
          <h2 className="mt-2 text-2xl font-bold">{exercise.exercise_name}</h2>
          {screen.step === 'prepare' ? (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-2 p-5">
                <div><p className="text-sm text-muted">Target {exercise.metric === 'time' ? 'seconds' : 'reps'}</p><p className="mt-2 text-4xl font-bold tabular-nums">{exercise.metric === 'time' ? exercise.target_seconds : exercise.target_reps}</p></div>
                <div><p className="text-sm text-muted">Plan weight</p><p className="mt-2 text-2xl font-bold tabular-nums">{row.weight ? `${row.weight} ${unit}` : 'Bodyweight'}</p></div>
              </div>
              {exercise.notes && <p className="text-sm text-muted">{exercise.notes}</p>}
              {exercise.metric === 'reps' && <div>
                <label className="text-sm font-medium" htmlFor="movement-type">Exercise type</label>
                <select id="movement-type" className="input mt-2" value={movementTypes[exercise.id] ?? ''} onChange={(event) => setMovementTypes((previous) => ({ ...previous, [exercise.id]: event.target.value as MovementType || null }))}>
                  <option value="">Choose type</option><option value="compound">Compound · multiple joints</option><option value="isolation">Isolation · one joint</option>
                </select>
                <p className="mt-2 text-xs leading-5 text-muted">{movementTypes[exercise.id] ? `Meet your rep target on every set to add ${progressionIncrement(movementTypes[exercise.id]!, unit)} ${unit} for next time.` : 'Choose the type for automatic weight increases.'} Bodyweight sets keep the same plan weight.</p>
              </div>}
              {row.setIndex > 0 && exercise.rest_seconds != null && <p className="text-sm text-muted">Suggested rest between sets: {exercise.rest_seconds} seconds. Start when you’re ready.</p>}
              <button type="button" className="btn-primary min-h-14 w-full" onClick={() => {
                const weightError = validateWeight()
                if (weightError) { setError(weightError); return }
                setError(null); setScreen({ step: 'running', key: row.key })
              }}><Play className="size-5" />Start set</button>
            </div>
          ) : screen.step === 'running' ? <>
            <p className="mt-2 text-sm text-muted">Target {exercise.metric === 'time' ? `${exercise.target_seconds}s` : `${exercise.target_reps} reps`} · {row.weight ? `${row.weight} ${unit}` : 'Bodyweight'}</p>
            <SetTimer key={row.key} canUseTempo={exercise.metric === 'reps'} onFinish={(elapsed) => finishSet(elapsed)} onTempo={() => setTempoOpen(true)} />
          </> : (
            <form className="mt-8 space-y-6" onSubmit={(event) => { event.preventDefault(); void saveResult() }}>
              <RestTimer key={row.key} startedAt={restStartedAt} suggestedSeconds={exercise.rest_seconds} />
              <div>
                <label className="text-lg font-semibold" htmlFor="actual-amount">{exercise.metric === 'time' ? 'How many seconds did you do?' : 'How many reps did you actually do?'}</label>
                <p className="mt-2 text-sm text-muted">Target: {exercise.metric === 'time' ? `${exercise.target_seconds} seconds` : `${exercise.target_reps} reps`}. Confirm your result before saving.</p>
                <input key={row.key} autoFocus id="actual-amount" type="number" inputMode="numeric" min="0" max={exercise.metric === 'time' ? 3600 : 1000} step="1" required className="input mt-4 py-4 text-center text-3xl" value={actualAmount} disabled={busy} onChange={(event) => setActualAmount(event.target.value)} />
              </div>
              <p className="text-sm text-muted">Plan weight: {row.weight ? `${row.weight} ${unit}` : 'Bodyweight'}. Change weight in your workout plan.</p>
              {exercise.metric === 'reps' && <label className="block text-sm font-medium" htmlFor="result-movement-type">Exercise type
                <select id="result-movement-type" className="input mt-2" disabled={busy} value={movementTypes[exercise.id] ?? ''} onChange={(event) => setMovementTypes((previous) => ({ ...previous, [exercise.id]: event.target.value as MovementType || null }))}>
                  <option value="">Choose type</option><option value="compound">Compound · multiple joints</option><option value="isolation">Isolation · one joint</option>
                </select>
              </label>}
              <button type="submit" className="btn-primary min-h-14 w-full" disabled={busy}>{busy ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}{nextRow ? 'Save and continue to next set' : 'Save and finish exercise'}</button>
              {nextRow && <p className="text-center text-sm text-muted">Starts set {nextRow.setIndex + 1} immediately. Continue when you’re rested and ready.</p>}
            </form>
          )}
        </section>
      ) : null}
      {tempoOpen && row && exercise && <GuidedSet exerciseName={exercise.exercise_name} setNumber={row.setIndex + 1} targetReps={exercise.target_reps} weight={row.weight} unit={unit} onComplete={(reps) => finishSet(undefined, reps)} onClose={() => setTempoOpen(false)} />}
    </div>
  )
}
