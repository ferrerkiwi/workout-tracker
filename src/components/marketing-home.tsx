import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Play,
  Timer,
} from 'lucide-react'
import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { DemoButton } from '@/components/demo-button'

export function MarketingHome() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <MarketingHeader />
      <main>
        <Hero />
        <Workflow />
        <PlanShowcase />
        <GuidedSetShowcase />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-semibold">
      <BrandMark size={36} className="rounded-lg" />
      <span className={compact ? 'hidden sm:inline' : undefined}>RepCadence</span>
    </span>
  )
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-background/95">
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link href="/" aria-label="RepCadence home">
          <Brand compact />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a className="transition-colors hover:text-foreground" href="#workflow">
            How it works
          </a>
          <a className="transition-colors hover:text-foreground" href="#guided-set">
            Guided Set
          </a>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="px-2 py-2 text-sm font-semibold text-muted transition-colors hover:text-foreground sm:px-3"
          >
            Log in
          </Link>
          <DemoButton className="px-2 py-2 text-sm sm:px-3" />
          <Link href="/signup" className="btn-primary px-3 py-2 sm:px-4">
            <span className="hidden sm:inline">Get started</span>
            <span className="sm:hidden">Start</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section className="border-b border-edge">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(31rem,1.15fr)] lg:gap-16">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-accent">REPCADENCE</p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.06] sm:text-6xl">
            Plan the week.
            <br />
            Log the work.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
            Keep one recurring routine, record every set, and return to the
            history that explains what you trained.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary min-h-12 px-5 text-base">
              Start training
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <DemoButton className="min-h-12 px-5 text-base" />
            <Link href="/login" className="px-4 py-3 text-center text-sm font-semibold text-muted hover:text-foreground">
              Log in
            </Link>
          </div>
          <p className="mt-7 text-sm text-muted">
            One weekly plan, a focused workout log, and a history that stays useful.
          </p>
        </div>
        <HeroPreview />
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <section className="overflow-hidden rounded-lg border border-edge bg-surface">
      <div className="flex items-center justify-between border-b border-edge px-5 py-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-4 text-accent" aria-hidden="true" />
          <div>
            <p className="font-semibold">Weekly plan</p>
            <p className="text-xs text-muted">Your recurring routine</p>
          </div>
        </div>
        <span className="text-xs font-medium text-accent">This week</span>
      </div>
      <div className="grid divide-y divide-edge sm:grid-cols-[1.15fr_0.85fr] sm:divide-x sm:divide-y-0">
        <div className="p-5">
          <p className="text-sm font-medium text-accent">MONDAY</p>
          <h2 className="mt-1 text-xl font-semibold">Upper strength</h2>
          <div className="mt-5 divide-y divide-edge border-y border-edge">
            <PreviewExercise name="Bench press" detail="3 × 8 · 135 lb" />
            <PreviewExercise name="Dumbbell row" detail="3 × 10 · 50 lb" />
            <PreviewExercise name="Cable fly" detail="2 × 12 · 25 lb" />
          </div>
          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-muted">3 exercises</span>
            <span className="font-medium text-accent">Ready to train</span>
          </div>
        </div>
        <div className="flex flex-col justify-between p-5">
          <div>
            <p className="text-sm font-medium text-muted">Next session</p>
            <p className="mt-2 text-lg font-semibold">Lower body</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Wednesday · 5 exercises · 60 minutes
            </p>
          </div>
          <div className="mt-8 border-t border-edge pt-4">
            <p className="text-sm font-medium">One routine. Clear history.</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Edit the plan when life changes. Logged workouts remain where
              they belong.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PreviewExercise({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="min-w-0 truncate text-sm font-medium">{name}</span>
      <span className="shrink-0 text-sm text-muted">{detail}</span>
    </div>
  )
}

function Workflow() {
  const steps = [
    ['01', 'Set the inputs that actually matter', 'Goals, experience, schedule, equipment, and priorities.'],
    ['02', 'Keep an editable weekly plan', 'Adjust a day, an exercise, or a load without starting a new week.'],
    ['03', 'Log the session in front of you', 'Record sets, use Guided Set when useful, and finish with a clean history entry.'],
  ]

  return (
    <section id="workflow" className="scroll-mt-20 border-b border-edge py-18 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-accent">THE WORKFLOW</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Built around training, not managing software.
          </h2>
        </div>
        <ol className="mt-10 divide-y divide-edge border-y border-edge">
          {steps.map(([number, title, description]) => (
            <li key={number} className="grid gap-3 py-5 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(16rem,0.8fr)] sm:items-baseline">
              <p className="font-mono text-sm text-accent">{number}</p>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-6 text-muted">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function PlanShowcase() {
  return (
    <section className="border-b border-edge py-18 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(20rem,0.7fr)] lg:gap-20">
        <PlanEditorPreview />
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-accent">WEEKLY PLAN</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Edit details without losing the program.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            Training days stay readable as a week. Exercise rows keep sets,
            reps, time, and load close together.
          </p>
          <ul className="mt-7 divide-y divide-edge border-y border-edge text-sm">
            {[
              'Change a movement, then keep the rest of the plan intact',
              'Switch a set between reps and time',
              'Use the coach for a focused edit when you need it',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 py-3 text-muted">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/signup" className="btn-primary mt-8">
            Build your week
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function PlanEditorPreview() {
  return (
    <section className="overflow-hidden rounded-lg border border-edge bg-surface">
      <div className="flex items-center justify-between border-b border-edge px-5 py-4">
        <div>
          <p className="font-semibold">Upper strength</p>
          <p className="mt-0.5 text-sm text-muted">Monday · 3 exercises</p>
        </div>
        <span className="text-xs font-medium text-accent">Active</span>
      </div>
      <div className="divide-y divide-edge">
        {[
          ['Bench press', '3', '8', '135'],
          ['Dumbbell row', '3', '10', '50'],
          ['Cable fly', '2', '12', '25'],
        ].map(([name, sets, reps, load]) => (
          <div key={name} className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{name}</p>
              <span className="text-xs text-muted">Reps</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <Metric label="Sets" value={sets} />
              <Metric label="Reps" value={reps} />
              <Metric label="Load" value={`${load} lb`} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function GuidedSetShowcase() {
  return (
    <section id="guided-set" className="scroll-mt-20 border-b border-edge py-18 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[minmax(19rem,0.75fr)_minmax(0,0.8fr)] lg:gap-20">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-accent">GUIDED SET</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Hold a pace without watching the clock.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            For rep-based movements, a three-second lower and one-second lift
            keep the set moving. Full cycles count. You decide when it ends.
          </p>
          <p className="mt-5 text-sm leading-6 text-muted">
            Audio and voice stopping are optional browser enhancements. The
            visual tempo and large Stop Set control always remain available.
          </p>
        </div>
        <GuidedSetPreview />
      </div>
    </section>
  )
}

function GuidedSetPreview() {
  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-edge bg-surface">
      <div className="border-b border-edge border-l-2 border-l-accent px-5 py-4">
        <p className="text-sm font-semibold text-accent">Guided set</p>
        <h3 className="mt-2 text-xl font-bold">Bench press</h3>
        <p className="mt-1 text-sm text-muted">Set 2 · Target: 10 reps · 135 lb</p>
      </div>
      <div className="px-6 py-8 text-center">
        <p className="text-sm font-semibold text-accent">REP 4</p>
        <p className="mt-4 text-6xl font-bold tabular-nums">3</p>
        <p className="mt-1 text-sm text-muted">completed reps</p>
        <p className="mt-8 text-4xl font-bold">LOWER</p>
        <p className="mt-2 text-sm text-muted">Controlled eccentric</p>
        <p className="mt-4 text-7xl font-bold tabular-nums text-accent">2</p>
        <p className="mt-7 flex items-center justify-center gap-2 text-sm text-muted">
          <Timer className="size-4 text-accent" aria-hidden="true" />
          Voice stop is listening
        </p>
      </div>
      <div className="border-t border-edge p-5">
        <div className="flex min-h-14 items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/10 text-sm font-semibold text-danger">
          <Play className="size-4 fill-current" aria-hidden="true" />
          Stop Set
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="py-18 sm:py-24">
      <div className="mx-auto max-w-6xl border-y border-edge px-4 py-12 sm:px-6 sm:py-16">
        <BrandMark size={44} className="rounded-lg" />
        <h2 className="mt-5 max-w-2xl text-3xl font-bold sm:text-4xl">
          Start with your actual training week.
        </h2>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          Try the full product with demo data, or build a routine around your
          own schedule.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <DemoButton className="min-h-12 px-5 text-base" />
          <Link href="/signup" className="btn-primary min-h-12 px-5 text-base">
            Create an account
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function MarketingFooter() {
  return (
    <footer className="border-t border-edge">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:px-6">
        <Brand />
        <p className="text-muted">Plan your week. Log the work.</p>
        <p className="text-muted">© {new Date().getFullYear()} RepCadence</p>
      </div>
    </footer>
  )
}
