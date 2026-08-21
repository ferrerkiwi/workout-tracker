'use client'

import Link from 'next/link'
import { Suspense, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AuthShell } from '@/components/auth-shell'
import {
  GoogleAuthFallback,
  GoogleAuthForm,
} from '@/components/google-auth-form'
import { login, type AuthState } from '@/lib/auth-actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Signing in…' : 'Sign in'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(login, {})

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to pick up your training week."
      footer={
        <>
          No account?{' '}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <Suspense fallback={<GoogleAuthFallback />}>
        <GoogleAuthForm source="login" />
      </Suspense>

      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center gap-2.5 text-sm text-muted select-none">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="size-4 rounded border-edge bg-surface-2 accent-accent"
          />
          Keep me signed in on this device
        </label>

        {state.error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </AuthShell>
  )
}
