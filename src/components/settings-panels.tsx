'use client'

import { LogOut, RotateCcw } from 'lucide-react'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { logout } from '@/lib/auth-actions'
import {
  resetTrainingData,
  updateDisplayName,
  type SettingsState,
} from '@/lib/settings-actions'

function SaveButton({ label = 'Save' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  )
}

export function DisplayNamePanel({ initial }: { initial: string }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    updateDisplayName,
    {},
  )

  return (
    <form action={formAction} className="card">
      <h2 className="font-semibold">Your name</h2>
      <p className="mt-1 text-sm text-muted">Shown on your overview page.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="display_name">
            Name
          </label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={initial}
            className="input"
          />
        </div>
        <SaveButton />
      </div>
      {state.error && (
        <p className="mt-3 text-sm text-danger">{state.error}</p>
      )}
      {state.saved && <p className="mt-3 text-sm text-accent">Name updated.</p>}
    </form>
  )
}

export function DangerZonePanel() {
  const [confirming, setConfirming] = useState(false)
  const [resetState, resetAction, resetting] = useActionState<SettingsState, FormData>(
    async () => resetTrainingData(), {},
  )

  return (
    <div className="card border-danger/25">
      <h2 className="font-semibold">Start over</h2>
      <p className="mt-1 text-sm text-muted">
        Deletes every routine and logged workout, then takes you back through
        the questionnaire. Your login stays as it is. This cannot be undone.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="btn-danger mt-4"
        >
          <RotateCcw className="size-4" />
          Reset my training data
        </button>
      ) : (
        <form
          action={resetAction}
          className="mt-4 flex flex-wrap gap-2"
        >
          <button type="submit" className="btn-danger" disabled={resetting}>
            <RotateCcw className="size-4" />
            {resetting ? 'Deleting…' : 'Yes, delete everything'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="btn-ghost"
          >
            Cancel
          </button>
        </form>
      )}
      {resetState.error && <p role="alert" className="mt-3 text-sm text-danger">{resetState.error}</p>}
    </div>
  )
}

export function SignOutPanel() {
  return (
    <form action={logout} className="card flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="font-semibold">Session</h2>
        <p className="mt-1 text-sm text-muted">
          Sign out of this device.
        </p>
      </div>
      <button type="submit" className="btn-ghost">
        <LogOut className="size-4" />
        Sign out
      </button>
    </form>
  )
}
