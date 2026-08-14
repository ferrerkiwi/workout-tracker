import { Pencil } from 'lucide-react'
import Link from 'next/link'

export type PreferenceFact = readonly [string, string]

/**
 * Read-only view of the parameters a routine gets generated from, with a way
 * out to change them. Shown both before the first generation and in the
 * confirmation for regenerating.
 */
export function PreferencesSummary({
  facts,
  className = 'card',
  title = 'Your parameters',
}: {
  facts: readonly PreferenceFact[]
  className?: string
  title?: string
}) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
        >
          <Pencil className="size-3.5" />
          Edit
        </Link>
      </div>

      {facts.length === 0 ? (
        <p className="text-sm text-muted">
          No preferences set yet.
        </p>
      ) : (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium text-muted uppercase tracking-wide">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
