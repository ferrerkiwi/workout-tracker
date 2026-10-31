import { compareTrainingVolume } from '@/lib/progression'
import { formatVolume } from '@/lib/week'

type VolumeSession = { total_volume: number; unit: string }

export function VolumeProgression({ current, previous, unit, through }: {
  current: VolumeSession[]; previous: VolumeSession[]; unit: string; through: string
}) {
  const trend = compareTrainingVolume(current, previous, unit)
  const change = Math.abs(trend.difference) < 0.5 ? 'No change'
    : `${trend.difference > 0 ? '+' : '−'}${formatVolume(Math.abs(trend.difference), unit)}`
  return (
    <section className="card mt-6" aria-labelledby="volume-progression-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="volume-progression-title" className="text-lg font-semibold">Your progress</h2>
          <p className="mt-1 text-sm text-muted">Training volume · Monday through {through}</p>
        </div>
        {trend.hasBaseline && <p className="text-lg font-semibold tabular-nums">
          {trend.percent == null ? change : `${trend.percent > 0 ? '+' : ''}${Math.round(trend.percent)}%`}
          <span className="mt-1 block text-sm font-normal text-muted">vs. the same days last week</span>
        </p>}
      </div>
      <dl className="mt-5 space-y-4">
        <div>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><dt>Last week</dt><dd className="tabular-nums">{formatVolume(trend.previousVolume, unit)}</dd></div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden="true"><div className="h-full rounded-full bg-muted" style={{ width: `${trend.previousBar}%` }} /></div>
        </div>
        <div>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><dt>This week</dt><dd className="font-semibold text-accent tabular-nums">{formatVolume(trend.currentVolume, unit)}</dd></div>
          <div className="h-2 rounded-full bg-surface-2" aria-hidden="true"><div className="h-full rounded-full bg-accent" style={{ width: `${trend.currentBar}%` }} /></div>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted">{trend.hasBaseline
        ? `${change} compared with the same days last week. ${current.length} workout${current.length === 1 ? '' : 's'} this week; ${previous.length} last week.`
        : current.length > 0 ? 'Your first comparison will appear once you have workouts in both weeks.' : 'Finish a workout to start building your comparison.'}</p>
      <p className="mt-2 text-xs text-muted">Volume is reps × load. Bodyweight and timed sets do not add loaded volume.</p>
    </section>
  )
}
