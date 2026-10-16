'use client'

import { Loader2, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function DemoButton({ className = '' }: { className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function startDemo() {
    if (busy) return

    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: 'Demo User' } },
    })

    if (signInError) {
      setError('Demo mode is unavailable right now. Please try again later.')
      setBusy(false)
      return
    }

    try {
      const response = await fetch('/api/demo/initialize', { method: 'POST' })
      if (!response.ok) throw new Error('Demo initialization failed.')

      router.replace('/dashboard')
      router.refresh()
    } catch {
      await supabase.auth.signOut()
      setError('Could not open the demo. Please try again.')
      setBusy(false)
    }
  }

  return (
    <span className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => void startDemo()}
        disabled={busy}
        className={`btn-ghost ${className}`}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
        {busy ? 'Opening demo…' : 'Try demo'}
      </button>
      {error && (
        <span role="alert" className="absolute top-full left-0 mt-2 w-64 text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  )
}
