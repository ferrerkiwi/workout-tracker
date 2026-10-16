import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getCompletedReps,
  getReadyCountdown,
  getTempoSnapshot,
  isVoiceStopCommand,
} from '../src/lib/guided-set.ts'
import { safeInternalPath } from '../src/lib/auth-redirect.ts'
import { SerialWriteQueue } from '../src/lib/serial-write-queue.ts'
import { validateLoggedSet } from '../src/lib/session-validation.ts'
import { DEMO_COACH_REQUEST_LIMIT, isAnonymousUser } from '../src/lib/demo.ts'
import { isScheduledLaterThisWeek } from '../src/lib/week.ts'
import {
  formatSetElapsed,
  inferMovementType,
  progressionIncrement,
  startingWorkoutWeight,
} from '../src/lib/workout-flow.ts'

test('common exercise types are recognized and unknown names require a choice', () => {
  for (const name of ['Barbell bench press', 'Romanian deadlift', 'Dumbbell row', 'Pull-ups', 'Bulgarian split squat']) {
    assert.equal(inferMovementType(name), 'compound', name)
  }
  for (const name of ['Biceps curl', 'Dumbbell fly', 'Lateral raise', 'Leg extension', 'Triceps pushdown']) {
    assert.equal(inferMovementType(name), 'isolation', name)
  }
  assert.equal(inferMovementType('My custom exercise'), null)
  assert.equal(inferMovementType('Plank'), null)
})

test('progression uses the requested pound increases and converts kilogram plans', () => {
  assert.equal(progressionIncrement('compound', 'lbs'), 10)
  assert.equal(progressionIncrement('isolation', 'lbs'), 5)
  assert.equal(progressionIncrement('compound', 'kg'), 4.54)
  assert.equal(progressionIncrement('isolation', 'kg'), 2.27)
})

test('earned plan weights take priority over previous workout history', () => {
  assert.equal(startingWorkoutWeight(145, 135), '145')
  assert.equal(startingWorkoutWeight(null, 135), '135')
  assert.equal(startingWorkoutWeight(null, undefined), '')
  assert.equal(startingWorkoutWeight(0, 135), '0')
})

test('set timer displays full elapsed minutes without resetting at one hour', () => {
  assert.equal(formatSetElapsed(999), '00:00')
  assert.equal(formatSetElapsed(65_123), '01:05')
  assert.equal(formatSetElapsed(3_600_000), '60:00')
})

test('recurring routine scheduling does not reset across calendar weeks', () => {
  const monday = new Date(2026, 8, 7)
  const wednesday = new Date(2026, 8, 9)

  assert.equal(isScheduledLaterThisWeek(0, monday), false)
  assert.equal(isScheduledLaterThisWeek(2, monday), true)
  assert.equal(isScheduledLaterThisWeek(2, wednesday), false)
  assert.equal(isScheduledLaterThisWeek(6, wednesday), true)
})

test('demo identity depends on the authoritative Supabase anonymous claim', () => {
  assert.equal(isAnonymousUser({ is_anonymous: true }), true)
  assert.equal(isAnonymousUser({ is_anonymous: false }), false)
  assert.equal(isAnonymousUser(null), false)
  assert.equal(DEMO_COACH_REQUEST_LIMIT, 3)
})
test('Guided Set counts only completed 3-0-1-0 tempo cycles', () => {
  assert.equal(getCompletedReps(0), 0)
  assert.equal(getCompletedReps(3_999), 0)
  assert.equal(getCompletedReps(4_000), 1)
  assert.equal(getCompletedReps(11_999), 2)
  assert.equal(getCompletedReps(12_000), 3)
})

test('Guided Set derives the visual tempo from elapsed monotonic time', () => {
  assert.deepEqual(getTempoSnapshot(0), {
    completedReps: 0,
    phase: 'eccentric',
    phaseCountdown: 3,
  })
  assert.deepEqual(getTempoSnapshot(2_001), {
    completedReps: 0,
    phase: 'eccentric',
    phaseCountdown: 1,
  })
  assert.deepEqual(getTempoSnapshot(3_000), {
    completedReps: 0,
    phase: 'concentric',
    phaseCountdown: 1,
  })
  assert.equal(getReadyCountdown(0), 3)
  assert.equal(getReadyCountdown(2_999), 1)
})

test('voice stopping accepts only complete normalized commands', () => {
  assert.equal(isVoiceStopCommand('Stop'), true)
  assert.equal(isVoiceStopCommand('stop set!'), true)
  assert.equal(isVoiceStopCommand('stopping'), false)
  assert.equal(isVoiceStopCommand('unstoppable'), false)
  assert.equal(isVoiceStopCommand('please stop'), false)
})

test('logged sets are validated at the server boundary', () => {
  const valid = {
    exercise_name: 'Bench press',
    order_index: 0,
    set_index: 0,
    reps: 8,
    seconds: null,
    weight: 135,
    completed: true,
  }

  assert.equal(validateLoggedSet(valid), null)
  assert.match(
    validateLoggedSet({ ...valid, reps: 8, seconds: 45 }) ?? '',
    /both reps and seconds/,
  )
  assert.match(
    validateLoggedSet({ ...valid, reps: -1 }) ?? '',
    /between 0 and 1000/,
  )
  assert.match(
    validateLoggedSet({ ...valid, set_index: 1.5 }) ?? '',
    /Set number is invalid/,
  )
  assert.match(
    validateLoggedSet({ ...valid, weight: -5 }) ?? '',
    /between 0 and 5000/,
  )
})

test('auth redirects remain inside the application', () => {
  assert.equal(safeInternalPath('/plan?tab=coach'), '/plan?tab=coach')
  assert.equal(safeInternalPath('https://example.com'), '/dashboard')
  assert.equal(safeInternalPath('//example.com'), '/dashboard')
  assert.equal(safeInternalPath('/\\example.com'), '/dashboard')
})

test('session writes run in order and recover after a failed write', async () => {
  const queue = new SerialWriteQueue()
  const events: string[] = []

  const first = queue.enqueue(async () => {
    events.push('first:start')
    await Promise.resolve()
    events.push('first:end')
  })
  const failed = queue.enqueue(async () => {
    events.push('failed')
    throw new Error('offline')
  })
  const last = queue.enqueue(async () => {
    events.push('last')
  })

  await first
  await assert.rejects(failed, /offline/)
  await last
  await queue.flush()
  assert.deepEqual(events, ['first:start', 'first:end', 'failed', 'last'])
})
