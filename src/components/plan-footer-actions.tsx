'use client'

import { Eraser, Loader2, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  PreferencesSummary,
  type PreferenceFact,
} from '@/components/preferences-summary'
import { resetPlanToEmpty } from '@/lib/routine-actions'
import { useGenerate } from '@/lib/use-generate'

type Pending = 'regenerate' | 'clear' | null

export function PlanFooterActions({
  canGenerate,
  facts,
}: {
  canGenerate: boolean
  facts: readonly PreferenceFact[]
}) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<Pending>(null)
  const [clearing, startClearing] = useTransition()
  const [clearError, setClearError] = useState<string | null>(null)
  const { generate, busy, error } = useGenerate()

  const working = busy || clearing

  async function doRegenerate() {
    setConfirming(null)
    await generate()
  }

  function doClear() {
    setConfirming(null)
    startClearing(async () => {
      const res = await resetPlanToEmpty()
      if (res.error) {
        setClearError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <section className="card mt-8">
      <h2 className="font-semibold">Start this week over</h2>
      <p className="mt-1 text-sm text-muted">
        Both options replace this week&rsquo;s plan only. Workouts you have
        already logged stay in your history.
      </p>

      {(error || clearError) && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error ?? clearError}
        </p>
      )}

      {confirming === 'regenerate' ? (
        <Confirm
          question="Replace this week's plan with a newly generated one?"
          detail="Every exercise you have added or edited this week will be discarded. The new week is built from these parameters:"
          confirmLabel="Yes, generate again"
          onConfirm={doRegenerate}
          onCancel={() => setConfirming(null)}
        >
          <PreferencesSummary
            facts={facts}
            title="Generating from"
            className="mt-3 rounded-xl border border-edge bg-surface p-4"
          />
        </Confirm>
      ) : confirming === 'clear' ? (
        <Confirm
          question="Clear this week's plan?"
          detail="All seven days become empty rest days for you to build from scratch."
          confirmLabel="Yes, clear it"
          onConfirm={doClear}
          onCancel={() => setConfirming(null)}
        />
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setConfirming('regenerate')}
            disabled={working || !canGenerate}
            title={
              canGenerate
                ? undefined
                : 'Set your training preferences in settings first.'
            }
            className="btn-ghost"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Generate plan again
          </button>
          <button
            onClick={() => setConfirming('clear')}
            disabled={working}
            className="btn-danger"
          >
            {clearing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Eraser className="size-4" />
            )}
            Clear plan
          </button>
        </div>
      )}
    </section>
  )
}

function Confirm({
  question,
  detail,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
}: {
  question: string
  detail: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="mt-4 rounded-xl border border-accent/30 bg-accent/5 p-4">
      <p className="font-medium">{question}</p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
      {children}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onConfirm} className="btn-danger">
          {confirmLabel}
        </button>
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
      </div>
    </div>
  )
}
