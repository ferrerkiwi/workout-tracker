'use client'

import { useSearchParams } from 'next/navigation'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  GOOGLE_AUTH_ERROR_PARAM,
  googleAuthErrorMessage,
  safeInternalPath,
  type AuthSource,
} from '@/lib/auth-redirect'
import { continueWithGoogle, type AuthState } from '@/lib/auth-actions'

function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-5 place-items-center rounded-full bg-white text-sm font-bold text-slate-900"
    >
      G
    </span>
  )
}

function GoogleSubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className="btn-ghost w-full" disabled={pending}>
      <GoogleMark />
      {pending ? 'Opening Google...' : 'Continue with Google'}
    </button>
  )
}

export function GoogleAuthFallback() {
  return (
    <div className="space-y-4">
      <button type="button" className="btn-ghost w-full" disabled>
        <GoogleMark />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs uppercase text-muted">
        <span className="h-px flex-1 bg-edge" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-edge" />
      </div>
    </div>
  )
}

export function GoogleAuthForm({ source }: { source: AuthSource }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    continueWithGoogle,
    {},
  )
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const next = nextParam ? safeInternalPath(nextParam, '') : ''
  const queryError = googleAuthErrorMessage(
    searchParams.get(GOOGLE_AUTH_ERROR_PARAM),
  )

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="source" value={source} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <GoogleSubmitButton />
      </form>

      {(state.error || queryError) && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error ?? queryError}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs uppercase text-muted">
        <span className="h-px flex-1 bg-edge" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-edge" />
      </div>
    </div>
  )
}
