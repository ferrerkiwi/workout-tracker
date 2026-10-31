'use client'

import { Bot, Loader2, MessageCircle, RotateCcw, Send, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useId, useRef, useState } from 'react'
import { boundedCoachHistory } from '@/lib/coach-request'
import { useModalDialog } from '@/lib/use-modal-dialog'

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

export function RoutineCoach() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null)
  const retryRequestId = useRef<string | null>(null)
  const [canRetry, setCanRetry] = useState(true)

  async function sendMessage(
    message: string,
    options: { appendUserMessage?: boolean } = {},
  ) {
    const content = message.trim()
    if (!content || busy) return
    const appendUserMessage = options.appendUserMessage ?? true

    setError(null)
    setCanRetry(true)
    const requestId = options.appendUserMessage === false && retryRequestId.current ? retryRequestId.current : crypto.randomUUID()
    retryRequestId.current = requestId
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
          requestId,
          message: content,
          history: boundedCoachHistory(messages),
        }),
      })
      const body = (await res.json().catch(() => ({}))) as {
        message?: string
        error?: string
        routineChanged?: boolean
      }

      if (body.routineChanged) {
        router.refresh()
        setCanRetry(false)
      }
      if (!res.ok || !body.message) {
        if (!body.routineChanged && res.status !== 429) retryRequestId.current = null
        throw new Error(body.error ?? 'The coach could not respond.')
      }

      setMessages([
        ...nextMessages,
        { role: 'assistant', content: body.message },
      ])

      retryRequestId.current = null
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
      setDraft={setDraft}
      onSubmit={onSubmit}
      onSuggestion={(suggestion) => void sendMessage(suggestion)}
      canRetry={canRetry}
      onRetry={() =>
        canRetry && lastUserMessage &&
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
        className="btn-ghost fixed right-4 bottom-[calc(var(--mobile-nav-height)+1rem)] z-30 border-accent/40 bg-surface shadow-lg shadow-black/25 sm:bottom-4 lg:hidden"
      >
        <MessageCircle className="size-4" />
        Routine coach
      </button>

      {drawerOpen && <CoachDrawer onClose={() => setDrawerOpen(false)}>
        <CoachPanel
          busy={busy} draft={draft} error={error} messages={messages}
          setDraft={setDraft} onSubmit={onSubmit}
          onSuggestion={(suggestion) => void sendMessage(suggestion)}
          canRetry={canRetry}
          onRetry={() => { if (canRetry && lastUserMessage) void sendMessage(lastUserMessage, { appendUserMessage: false }) }}
          inDrawer
        />
      </CoachDrawer>}
    </>
  )
}

function CoachDrawer({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useModalDialog()
  const titleId = useId()
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) onClose() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [onClose])
  return (
    <dialog ref={ref} aria-labelledby={titleId} className="modal-viewport bg-transparent open:flex open:items-end open:justify-center"
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="coach-drawer flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-t-lg border border-edge bg-surface shadow-2xl">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 id={titleId} className="font-semibold">Routine coach</h2>
          <button type="button" aria-label="Close routine coach" onClick={onClose} className="btn-ghost min-h-[44px] min-w-[44px] shrink-0 px-0"><X className="size-5" /></button>
        </header>
        {children}
      </section>
    </dialog>
  )
}

function CoachPanel({
  busy,
  draft,
  error,
  messages,
  setDraft,
  onSubmit,
  onSuggestion,
  onRetry,
  canRetry,
  inDrawer = false,
}: {
  busy: boolean
  draft: string
  error: string | null
  messages: ChatMessage[]
  setDraft: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSuggestion: (suggestion: string) => void
  canRetry: boolean
  inDrawer?: boolean
  onRetry: () => void
}) {
  const inputId = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'auto' })
  }, [messages, busy, error])
  return (
    <section className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-edge bg-surface ${inDrawer ? 'flex-1' : 'h-[min(720px,calc(100dvh-4rem))]'}`}>
      {!inDrawer && <div className="shrink-0 border-b border-edge p-4">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-accent" />
          <h2 className="font-semibold">Routine coach</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Ask about your week or request a specific edit.
        </p>
      </div>}

      <div
        ref={scrollRef}
        tabIndex={0}
        role="log"
        aria-label="Coach conversation"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4"
      >
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              I can review the current plan, explain the split, or make focused
              changes like swaps, sets, reps, ordering, and rest days.
            </p>
            <div className="grid divide-y divide-edge border-y border-edge">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSuggestion(suggestion)}
                  disabled={busy}
                  className="h-auto py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:text-accent disabled:opacity-50"
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
          <div className="rounded-md border border-danger/30 bg-danger/10 p-3">
            <p className="text-sm text-danger">{error}</p>
            {canRetry && <button
              type="button"
              onClick={onRetry}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
            >
              <RotateCcw className="size-3" />
              Retry
            </button>}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-edge p-3">
        <label className="sr-only" htmlFor={inputId}>
          Message routine coach
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id={inputId}
            data-dialog-initial-focus={inDrawer ? true : undefined}
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
            className="input min-h-11 resize-none text-base"
            disabled={busy}
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length === 0}
            aria-label="Send message"
            className="btn-primary min-h-[44px] min-w-[44px] shrink-0 px-0"
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
        className={`min-w-0 max-w-[95%] wrap-anywhere rounded-md px-3 py-2 text-sm ${
          isUser
            ? 'bg-accent/15 text-foreground'
            : 'border-l-2 border-edge pl-3 text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}
