'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { saveRoutine } from '@/lib/routine-actions'

type GenerateResponse = {
  routine: Parameters<typeof saveRoutine>[0]
  model: string
  promptVersion: string
  error?: string
}

/**
 * Generates a week and writes it straight into the plan.
 *
 * There is no separate preview step: the result lands in the editor, which is
 * more useful than a read-only preview and keeps "generate again" one click
 * away if it isn't right.
 */
export function useGenerate() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/generate-routine', { method: 'POST' })
      const data = (await response.json()) as GenerateResponse
      if (!response.ok) {
        setError(data.error ?? 'Generation failed.')
        return false
      }

      const saved = await saveRoutine(data.routine, data.model, data.promptVersion)
      if (saved.error) {
        setError(saved.error)
        return false
      }

      router.refresh()
      return true
    } catch {
      setError('Could not reach the server. Check your connection.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return { generate, busy, error, setError }
}
