import type Anthropic from '@anthropic-ai/sdk'
import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources'

export type CoachRunResult = { message?: string; error?: string; routineChanged: boolean }

/** Keep saved tool results visible even when a later model call fails. */
export async function runCoach({ messages, maxSteps, respond, execute, refreshContext, checkpoint, onError = () => undefined }: {
  messages: MessageParam[]
  maxSteps: number
  respond: (messages: MessageParam[]) => Promise<Anthropic.Message['content']>
  execute: (name: string, input: unknown) => Promise<{ ok: boolean; message: string; routineChanged: boolean }>
  refreshContext: () => Promise<string>
  checkpoint: (result: CoachRunResult) => Promise<void>
  onError?: (error: unknown) => void
}): Promise<CoachRunResult> {
  const startedAt = performance.now()
  let routineChanged = false
  const saved: string[] = []
  const partial = (error: string): CoachRunResult => ({
    error: routineChanged ? `${error} Saved changes: ${saved.join(' ')} Review your plan before requesting more edits.` : error,
    routineChanged,
  })
  try {
    for (let step = 0; step < maxSteps; step++) {
      if (performance.now() - startedAt > 75_000) return partial('The coach reached the request time limit.')
      const content = await respond(messages)
      const uses = content.filter((block) => block.type === 'tool_use')
      if (uses.length === 0) {
        const message = content.filter((block) => block.type === 'text').map((block) => block.text.trim()).filter(Boolean).join('\n\n')
        return message ? { message, routineChanged } : partial('The coach returned no usable response.')
      }
      messages.push({ role: 'assistant', content })
      const results: ContentBlockParam[] = []
      for (const use of uses) {
        const result = await execute(use.name, use.input)
        if (result.routineChanged) {
          routineChanged = true
          saved.push(result.message)
          await checkpoint(partial('The request ended before the coach could finish responding.'))
        }
        results.push({ type: 'tool_result', tool_use_id: use.id, is_error: !result.ok,
          content: JSON.stringify({ ...result, currentRoutineContext: await refreshContext() }) })
      }
      messages.push({ role: 'user', content: results })
    }
    return partial('The coach reached the edit limit.')
  } catch (error) {
    onError(error)
    return partial('The coach could not finish this request.')
  }
}
