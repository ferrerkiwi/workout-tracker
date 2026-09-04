'use client'

import { Bot, Loader2, MessageCircle, RotateCcw, Send, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Review my week',
  "Reduce Tuesday's volume",
  'Swap an exercise',
  'Add more chest work',
]

const MAX_HISTORY = 8

export function RoutineCoach() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, busy, error, drawerOpen])

  async function sendMessage(
    message: string,
    options: { appendUserMessage?: boolean } = {},
  ) {
    const content = message.trim()
    if (!content || busy) return
    const appendUserMessage = options.appendUserMessage ?? true

    setError(null)
    setBusy(true)
    setDraft('')
    setLastUserMessage(content)

    const outgoing: ChatMessage = { role: 'user', content }
    const nextMessages = appendUserMessage ? [...messages, outgoing] : messages
    setMessages(nextMessages)

    try {
      const res = await fetch('/api/routine-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          history: messages.slice(-MAX_HISTORY),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        message?: string
        error?: string
        routineChanged?: boolean
      }

      if (!res.ok || !body.message) {
        throw new Error(body.error ?? 'The coach could not respond.')
      }

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: body.message },
      ])

      if (body.routineChanged) router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The coach failed.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(draft)
  }

  const panel = (
    <CoachPanel
      busy={busy}
      draft={draft}
      error={error}
      messages={messages}
      scrollRef={scrollRef}
      setDraft={setDraft}
      onSubmit={onSubmit}
      onSuggestion={(suggestion) => void sendMessage(suggestion)}
      onRetry={() =>
        lastUserMessage &&
        void sendMessage(lastUserMessage, { appendUserMessage: false })
      }
    />
  )

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-8">{panel}</div>
      </aside>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="btn-primary fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 shadow-lg sm:bottom-4 lg:hidden"
      >
        <MessageCircle className="size-4" />
        Routine coach
      </button>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close routine coach"
            className="absolute inset-0 bg-background/80"
            onClick={() => setDrawerOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] min-h-[70dvh] flex-col rounded-t-2xl border border-edge bg-surface p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="size-5 text-accent" />
                <h2 className="font-semibold">Routine coach</h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            {panel}
          </section>
        </div>
      )}
    </>
  )
}

function CoachPanel({
  busy,
  draft,
  error,
  messages,
  scrollRef,
  setDraft,
  onSubmit,
  onSuggestion,
  onRetry,
}: {
  busy: boolean
  draft: string
  error: string | null
  messages: ChatMessage[]
  scrollRef: RefObject<HTMLDivElement | null>
  setDraft: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSuggestion: (suggestion: string) => void
  onRetry: () => void
}) {
  return (
    <section className="card flex h-[min(720px,calc(100dvh-4rem))] min-h-0 flex-col p-0">
      <div className="border-b border-edge p-4">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-accent" />
          <h2 className="font-semibold">Routine coach</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Ask about your week or request a specific edit.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              I can review the current plan, explain the split, or make focused
              changes like swaps, sets, reps, ordering, and rest days.
            </p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestion(suggestion)}
                  disabled={busy}
                  className="btn-ghost h-auto justify-start px-3 py-2 text-left text-xs"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))
        )}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Thinking through your plan...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
            >
              <RotateCcw className="size-3" />
              Retry
            </button>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-edge p-3">
        <label className="sr-only" htmlFor="routine-coach-message">
          Message routine coach
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="routine-coach-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            maxLength={1200}
            rows={2}
            placeholder="Ask or request a focused edit..."
            className="input min-h-11 resize-none"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            aria-label="Send message"
            className="btn-primary px-3"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-accent text-slate-950'
            : 'border border-edge bg-surface-2 text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
