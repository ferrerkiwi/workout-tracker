'use client'

import { ArrowLeft, Loader2, PenLine, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  PreferencesSummary,
  type PreferenceFact,
} from '@/components/preferences-summary'
import { resetPlanToEmpty } from '@/lib/routine-actions'
import { useGenerate } from '@/lib/use-generate'

export function PlanStart({
  facts,
  hasPreferences,
}: {
  facts: readonly PreferenceFact[]
  hasPreferences: boolean
}) {
  const router = useRouter()
  const [choice, setChoice] = useState<'generate' | null>(null)
  const [building, startBuilding] = useTransition()
  const [buildError, setBuildError] = useState<string | null>(null)
  const { generate, busy, error } = useGenerate()

  function buildOwn() {
    startBuilding(async () => {
      const res = await resetPlanToEmpty()
      if (res.error) {
        setBuildError(res.error)
        return
      }
      router.refresh()
    })
  }

  if (choice === 'generate') {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setChoice(null)}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <PreferencesSummary facts={facts} />

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button onClick={generate} disabled={busy} className="btn-primary w-full">
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Writing your week…
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generate my week
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted">
        No plan for this week yet. How would you like to start?
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setChoice('generate')}
          disabled={!hasPreferences}
          className="card flex flex-col items-start gap-2 text-left transition
                     hover:border-accent/50 disabled:opacity-50"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent/15">
            <Sparkles className="size-5 text-accent" />
          </span>
          <span className="mt-1 font-semibold">Generate one for me</span>
          <span className="text-sm text-muted">
            Builds a week from your preferences. You can edit anything
            afterwards.
          </span>
        </button>

        <button
          onClick={buildOwn}
          disabled={building}
          className="card flex flex-col items-start gap-2 text-left transition
                     hover:border-accent/50 disabled:opacity-50"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2">
            {building ? (
              <Loader2 className="size-5 animate-spin text-muted" />
            ) : (
              <PenLine className="size-5 text-muted" />
            )}
          </span>
          <span className="mt-1 font-semibold">Build my own</span>
          <span className="text-sm text-muted">
            Starts with an empty week. Turn off rest days and add your own
            exercises.
          </span>
        </button>
      </div>

      {!hasPreferences && (
        <p className="rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-muted">
          Set your training preferences in{' '}
          <Link href="/settings" className="text-accent hover:underline">
            settings
          </Link>{' '}
          to generate a routine.
        </p>
      )}
      {buildError && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {buildError}
        </p>
      )}
    </div>
  )
}
