'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AuthShell } from '@/components/auth-shell'
import { signup, type AuthState } from '@/lib/auth-actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  )
}

export default function SignupPage() {
  const [state, formAction] = useActionState<AuthState, FormData>(signup, {})

  return (
    <AuthShell
      title="Start training"
      subtitle="A few questions next, then your first routine."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="display_name">
            Name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            className="input"
            placeholder="Andres"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            className="input"
            placeholder="At least 8 characters"
          />
        </div>

        {state.error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.notice && (
          <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            {state.notice}
          </p>
        )}

        <SubmitButton />
      </form>
    </AuthShell>
  )
}
