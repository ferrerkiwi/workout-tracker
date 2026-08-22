export const READY_DURATION_MS = 3_000
export const ECCENTRIC_DURATION_MS = 3_000
export const CONCENTRIC_DURATION_MS = 1_000
export const REP_DURATION_MS = ECCENTRIC_DURATION_MS + CONCENTRIC_DURATION_MS

export type GuidedSetPhase = 'eccentric' | 'concentric'

export type TempoSnapshot = {
  completedReps: number
  phase: GuidedSetPhase
  phaseCountdown: number
}

/**
 * Derives the visible state from monotonic elapsed time. Rendering can be late
 * without turning a partial tempo cycle into a completed rep.
 */
export function getTempoSnapshot(elapsedMs: number): TempoSnapshot {
  const safeElapsed = Math.max(0, elapsedMs)
  const completedReps = Math.floor(safeElapsed / REP_DURATION_MS)
  const withinRep = safeElapsed % REP_DURATION_MS

  if (withinRep < ECCENTRIC_DURATION_MS) {
    return {
      completedReps,
      phase: 'eccentric',
      phaseCountdown: Math.max(1, 3 - Math.floor(withinRep / 1_000)),
    }
  }

  return {
    completedReps,
    phase: 'concentric',
    phaseCountdown: 1,
  }
}

/** Only a fully elapsed 3-0-1-0 cycle earns a rep. */
export function getCompletedReps(elapsedMs: number): number {
  return Math.floor(Math.max(0, elapsedMs) / REP_DURATION_MS)
}

export function getReadyCountdown(elapsedMs: number): number {
  return Math.max(1, 3 - Math.floor(Math.max(0, elapsedMs) / 1_000))
}

export function isVoiceStopCommand(transcript: string): boolean {
  const normalised = transcript
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return normalised === 'stop' || normalised === 'stop set'
}
