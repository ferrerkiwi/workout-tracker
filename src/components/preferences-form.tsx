'use client'

import { Check } from 'lucide-react'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  EQUIPMENT,
  EXPERIENCE_LEVELS,
  GOALS,
  MUSCLE_GROUPS,
} from '@/lib/constants'
import {
  savePreferences,
  type PreferencesState,
} from '@/lib/preferences-actions'

export type PreferencesDefaults = {
  goals: string[]
  experience_level: string
  days_per_week: number | null
  session_length_min: number | null
  equipment: string[]
  focus_muscles: string[]
  limitations: string
  unit_preference: string
}

export const EMPTY_PREFERENCES: PreferencesDefaults = {
  goals: ['build_muscle'],
  experience_level: 'beginner',
  days_per_week: 4,
  session_length_min: 60,
  equipment: ['Dumbbells', 'Barbell'],
  focus_muscles: [],
  limitations: '',
  unit_preference: 'lbs',
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="card">
      <h2 className="text-base font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Checkbox styled as a selectable pill. */
function Pill({
  name,
  value,
  defaultChecked,
}: {
  name: string
  value: string
  defaultChecked: boolean
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        className="inline-block rounded-full border border-edge bg-surface-2 px-3.5 py-1.5
                   text-sm text-muted transition
                   peer-checked:border-accent peer-checked:bg-accent/15
                   peer-checked:text-accent hover:border-accent/40"
      >
        {value}
      </span>
    </label>
  )
}

/**
 * A number field the user can hand over to the generator. When the checkbox is
 * ticked the input is disabled — so the browser omits it from the submission —
 * and the action stores null.
 */
function ScheduleField({
  id,
  label,
  autoName,
  autoLabel,
  min,
  max,
  step,
  fallback,
  value,
  auto,
  onAutoChange,
}: {
  id: string
  label: string
  autoName: string
  autoLabel: string
  min: number
  max: number
  step?: number
  fallback: number
  value: number | null
  auto: boolean
  onAutoChange: (next: boolean) => void
}) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="number"
        min={min}
        max={max}
        step={step}
        required={!auto}
        disabled={auto}
        defaultValue={value ?? fallback}
        className="input no-spin disabled:opacity-40"
      />
      <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-sm text-muted select-none">
        <input
          type="checkbox"
          name={autoName}
          checked={auto}
          onChange={(e) => onAutoChange(e.target.checked)}
          className="size-4 rounded border-edge bg-surface-2 accent-accent"
        />
        {autoLabel}
      </label>
    </div>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  )
}

export function PreferencesForm({
  mode,
  defaults,
  submitLabel,
}: {
  mode: 'onboarding' | 'settings'
  defaults: PreferencesDefaults
  submitLabel: string
}) {
  const [state, formAction] = useActionState<PreferencesState, FormData>(
    savePreferences,
    {},
  )
  // A null saved value means the generator picks the frequency.
  const [aiPicksDays, setAiPicksDays] = useState(defaults.days_per_week === null)
  const [aiPicksLength, setAiPicksLength] = useState(
    defaults.session_length_min === null,
  )

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="mode" value={mode} />

      <Section
        title="What are you training for?"
        hint="Pick as many as apply. This shapes exercise selection and rep ranges."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((goal) => (
            <label key={goal.value} className="cursor-pointer">
              <input
                type="checkbox"
                name="goals"
                value={goal.value}
                defaultChecked={defaults.goals.includes(goal.value)}
                className="peer sr-only"
              />
              {/* peer-checked uses a sibling combinator, so reaching the tick
                  inside needs an arbitrary variant rather than putting
                  peer-checked on the nested element itself. */}
              <span
                className="flex items-center gap-2.5 rounded-xl border border-edge
                           bg-surface-2 px-4 py-3 text-sm transition
                           hover:border-accent/40
                           peer-checked:border-accent peer-checked:bg-accent/10
                           peer-checked:[&_.tick]:border-accent
                           peer-checked:[&_.tick]:bg-accent
                           peer-checked:[&_svg]:opacity-100"
              >
                <span
                  className="tick flex size-4 shrink-0 items-center justify-center
                             rounded border border-edge transition"
                  aria-hidden
                >
                  <Check className="size-3 text-slate-950 opacity-0 transition" />
                </span>
                {goal.label}
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="How much training have you done?">
        <div className="grid gap-2 sm:grid-cols-3">
          {EXPERIENCE_LEVELS.map((level) => (
            <label key={level.value} className="cursor-pointer">
              <input
                type="radio"
                name="experience_level"
                value={level.value}
                defaultChecked={defaults.experience_level === level.value}
                className="peer sr-only"
              />
              <span
                className="block h-full rounded-xl border border-edge bg-surface-2 px-4 py-3
                           transition peer-checked:border-accent
                           peer-checked:bg-accent/10 hover:border-accent/40"
              >
                <span className="block text-sm font-medium">{level.label}</span>
                <span className="mt-0.5 block text-xs text-muted">
                  {level.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <Section
        title="Your schedule"
        hint="Leave either to the AI and it will pick what suits your goals."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ScheduleField
            id="days_per_week"
            label="Training days per week"
            autoName="ai_picks_days"
            autoLabel="Let the AI decide how often I train"
            min={1}
            max={7}
            fallback={4}
            value={defaults.days_per_week}
            auto={aiPicksDays}
            onAutoChange={setAiPicksDays}
          />
          <ScheduleField
            id="session_length_min"
            label="Minutes per session"
            autoName="ai_picks_length"
            autoLabel="Let the AI decide how long each session is"
            min={10}
            max={240}
            step={5}
            fallback={60}
            value={defaults.session_length_min}
            auto={aiPicksLength}
            onAutoChange={setAiPicksLength}
          />
        </div>
      </Section>

      <Section
        title="What can you train with?"
        hint="Only exercises using this equipment will be programmed."
      >
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT.map((item) => (
            <Pill
              key={item}
              name="equipment"
              value={item}
              defaultChecked={defaults.equipment.includes(item)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Anything you want to prioritise?"
        hint="Optional. Leave empty for a balanced week."
      >
        <div className="flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((item) => (
            <Pill
              key={item}
              name="focus_muscles"
              value={item}
              defaultChecked={defaults.focus_muscles.includes(item)}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Injuries or limitations"
        hint="Optional. Mention anything to avoid — the routine will work around it."
      >
        <textarea
          name="limitations"
          rows={3}
          defaultValue={defaults.limitations}
          placeholder="e.g. bad left knee, avoid overhead pressing"
          className="input resize-y"
        />
      </Section>

      <Section title="Units">
        <div className="flex gap-2">
          {['lbs', 'kg'].map((unit) => (
            <label key={unit} className="cursor-pointer">
              <input
                type="radio"
                name="unit_preference"
                value={unit}
                defaultChecked={defaults.unit_preference === unit}
                className="peer sr-only"
              />
              <span
                className="inline-block rounded-xl border border-edge bg-surface-2 px-5 py-2.5
                           text-sm transition peer-checked:border-accent
                           peer-checked:bg-accent/10 hover:border-accent/40"
              >
                {unit}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {state.error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          Preferences saved.
        </p>
      )}

      <div className="flex justify-end pt-1">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  )
}
