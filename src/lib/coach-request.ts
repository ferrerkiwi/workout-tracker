import { z } from 'zod'

export const COACH_HISTORY_MESSAGES = 8
export const COACH_HISTORY_CHARS = 1200

export type CoachMessage = { role: 'user' | 'assistant'; content: string }

/** Bound history on both sides, including replies longer than the next request limit. */
export function boundedCoachHistory(messages: CoachMessage[]): CoachMessage[] {
  return messages.slice(-COACH_HISTORY_MESSAGES).map((message) => ({
    ...message, content: message.content.slice(0, COACH_HISTORY_CHARS),
  }))
}

export const coachRequestSchema = z.object({
  requestId: z.string().uuid(),
  message: z.string().trim().min(1).max(1200),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(20_000).transform((text) => text.slice(0, COACH_HISTORY_CHARS)),
  })).max(COACH_HISTORY_MESSAGES).default([]),
}).strict()
