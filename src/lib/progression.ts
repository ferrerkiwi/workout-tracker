import { convertWeight } from './weight.ts'

type VolumeSession = { total_volume: number; unit: string }

/** Compare matching weekday windows and convert each session before summing. */
export function compareTrainingVolume(current: VolumeSession[], previous: VolumeSession[], unit: string) {
  const sum = (sessions: VolumeSession[]) => sessions.reduce((total, session) =>
    total + convertWeight(Number(session.total_volume), session.unit, unit), 0)
  const currentVolume = sum(current)
  const previousVolume = sum(previous)
  const difference = currentVolume - previousVolume
  const percent = previousVolume > 0 ? difference / previousVolume * 100 : null
  const maximum = Math.max(currentVolume, previousVolume, 1)
  return {
    currentVolume, previousVolume, difference, percent,
    currentBar: currentVolume / maximum * 100,
    previousBar: previousVolume / maximum * 100,
    hasBaseline: previous.length > 0,
  }
}
