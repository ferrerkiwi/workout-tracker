import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  ListChecks,
  Play,
  Sparkles,
  Timer,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: Sparkles,
    title: 'A plan built around you',
    description:
      'Start with your goals, experience, available equipment, schedule, and focus areas.',
  },
  {
    icon: CalendarDays,
    title: 'A week you can shape',
    description:
      'Edit training days, exercises, sets, reps, weights, order, and rest days whenever your week changes.',
  },
  {
    icon: Bot,
    title: 'A coach beside your plan',
    description:
      'Ask the Routine Coach to review your week or make a focused change to your current routine.',
  },
  {
    icon: ListChecks,
    title: 'Log the work that matters',
    description:
      'Record reps, loads, and timed work. Active workouts are ready when you come back.',
  },
  {
    icon: Timer,
    title: 'Guidance when you need it',
    description:
      'Use Guided Set for a clear 3-0-1 tempo, audio cues, and automatic completed-rep counting.',
  },
  {
    icon: TrendingUp,
    title: 'Keep your history close',
    description:
      'Review finished sessions, see previous work at a glance, and keep your training streak in view.',
  },
]

export function MarketingHome() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background text-foreground">
      <MarketingHeader />
      <main>
        <Hero />
        <Features />
        <PlanShowcase />
        <HowItWorks />
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
      <span className="flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-accent to-accent-strong text-slate-950 shadow-lg shadow-accent-strong/20">
        <Dumbbell className="size-4" aria-hidden="true" />
      </span>
      <span className={compact ? 'hidden sm:inline' : undefined}>RepCadence</span>
    </span>
  )
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-background/90 backdrop-blur">
      <nav
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6"
        aria-label="Main navigation"
      >
        <Link href="/" aria-label="RepCadence home">
          <Brand compact />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a className="transition hover:text-foreground" href="#features">
            Features
          </a>
          <a className="transition hover:text-foreground" href="#how-it-works">
            How it works
          </a>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-2.5 py-2 text-sm font-semibold text-muted transition hover:text-foreground sm:px-3"
          >
            Log in
          </Link>
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
    <section className="relative border-b border-edge">
      <div className="marketing-grid absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-12 px-4 pt-12 pb-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,0.92fr)_minmax(30rem,1.08fr)] lg:gap-16 lg:pt-20">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 text-sm font-medium text-accent">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Training, with a clearer next step
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
            Plan smarter.
            <br />
            <span className="text-accent">Train with intent.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted sm:text-xl">
            Turn your training preferences into a practical weekly routine, then log the work that moves you forward.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary min-h-12 px-5 text-base">
              Start training
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className="btn-ghost min-h-12 px-5 text-base">
              Log in
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-5 text-sm text-muted">
            <span className="flex items-center gap-2">
              <Check className="size-4 text-accent" aria-hidden="true" />
              Editable plans
            </span>
            <span className="flex items-center gap-2">
              <Check className="size-4 text-accent" aria-hidden="true" />
              Session logging
            </span>
          </div>
        </div>
        <HeroPreview />
      </div>
    </section>
  )
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl lg:mx-0">
      <section className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">Weekly plan</p>
              <p className="text-xs text-muted">Your training, organized</p>
            </div>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            This week
          </span>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-edge bg-surface-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-accent">MONDAY</p>
                <h2 className="mt-1 font-semibold">Upper strength</h2>
              </div>
              <span className="rounded-md bg-background px-2 py-1 text-xs text-muted">
                45 min
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              <ExerciseRow name="Bench press" detail="3 × 8" />
              <ExerciseRow name="Dumbbell row" detail="3 × 10" />
              <ExerciseRow name="Cable fly" detail="2 × 12" />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-edge pt-3 text-xs text-muted">
              <span>3 exercises</span>
              <span className="font-medium text-accent">Ready to train</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-edge bg-surface-2 p-4">
              <p className="text-xs font-medium text-muted">NEXT UP</p>
              <p className="mt-2 font-semibold">Lower body</p>
              <p className="mt-1 text-sm text-muted">Wednesday · 5 exercises</p>
            </div>
            <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
              <div className="flex items-center gap-2 text-accent">
                <Bot className="size-4" aria-hidden="true" />
                <p className="text-sm font-semibold">Routine coach</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/90">
                “Want to swap an exercise or adjust the week?”
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-accent">
                <span className="size-2 rounded-full bg-accent" />
                Ready to help
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ExerciseRow({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-edge bg-surface px-3 py-2.5">
      <span className="min-w-0 truncate text-sm font-medium">{name}</span>
      <span className="shrink-0 text-sm text-muted">{detail}</span>
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-edge py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-accent">BUILT FOR THE FULL WEEK</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            More than a place to write down sets.
          </h2>
          <p className="mt-4 text-lg leading-8 text-muted">
            Everything in the tracker is designed to keep planning, training, and reflection connected.
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-xl border border-edge bg-surface p-5 transition hover:border-accent/35 hover:bg-surface-2"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PlanShowcase() {
  return (
    <section className="border-b border-edge py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div className="order-2 lg:order-1">
          <PlanEditorPreview />
        </div>
        <div className="order-1 max-w-xl lg:order-2">
          <p className="text-sm font-semibold text-accent">YOUR WEEK, YOUR CALL</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Keep the plan flexible without losing the thread.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            A generated starting point is useful. The ability to make it yours is what makes it practical week after week.
          </p>
          <ul className="mt-7 space-y-3 text-sm text-muted">
            {[
              'Adjust exercises, sets, reps, and loads',
              'Reorder movements and mark training or rest days',
              'Use the Routine Coach for focused plan edits',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Check className="size-3" aria-hidden="true" />
                </span>
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
    <div className="overflow-hidden rounded-2xl border border-edge bg-surface shadow-xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-edge px-5 py-4">
        <div>
          <p className="font-semibold">Upper strength</p>
          <p className="mt-0.5 text-sm text-muted">Monday · 3 exercises</p>
        </div>
        <span className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">Active</span>
      </div>
      <div className="space-y-3 p-4">
        {[
          ['Bench press', '3', '8', '135'],
          ['Dumbbell row', '3', '10', '50'],
          ['Cable fly', '2', '12', '25'],
        ].map(([name, sets, reps, load]) => (
          <div key={name} className="rounded-xl border border-edge bg-surface-2 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{name}</p>
              <span className="text-xs text-muted">Reps</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Metric label="Sets" value={sets} />
              <Metric label="Reps" value={reps} />
              <Metric label="lbs" value={load} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-left text-muted">{label}</p>
      <p className="rounded-md border border-edge bg-surface px-2 py-2 text-sm font-medium">{value}</p>
    </div>
  )
}

function HowItWorks() {
  const steps = [
    ['01', 'Set your training preferences', 'Share your goals, experience, schedule, equipment, and focus areas.'],
    ['02', 'Start with a weekly plan', 'Generate a practical routine, then adjust every detail until it fits.'],
    ['03', 'Train and log the session', 'Record sets as you go, with Guided Set available for rep-based work.'],
    ['04', 'Use your history to keep going', 'Review completed workouts and return to your next planned session.'],
  ]

  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-edge py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent">HOW IT WORKS</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A clearer routine from day one.</h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted">
            Simple enough to start quickly, structured enough to keep your training organized.
          </p>
        </div>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <li key={number} className="min-h-52 bg-surface p-5">
              <p className="font-mono text-sm text-accent">{number}</p>
              <h3 className="mt-8 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function GuidedSetShowcase() {
  return (
    <section className="border-b border-edge py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-accent">WHEN YOU WANT A STEADY PACE</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Keep the tempo. Keep your focus.</h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            Guided Set gives rep-based movements a simple 3-second lower and 1-second lift rhythm, with visual and audio cues as you train.
          </p>
          <p className="mt-5 text-sm leading-6 text-muted">
            Completed reps are counted locally as full tempo cycles. You stay in control with a manual Stop Set button, and compatible browsers can also listen for “stop.”
          </p>
        </div>
        <GuidedSetPreview />
      </div>
    </section>
  )
}

function GuidedSetPreview() {
  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-edge bg-surface shadow-xl shadow-black/20">
      <div className="border-b border-edge p-5">
        <div className="flex items-center gap-2 text-accent">
          <Timer className="size-5" aria-hidden="true" />
          <p className="text-sm font-semibold">Guided set</p>
        </div>
        <h3 className="mt-3 text-xl font-bold">Bench press</h3>
        <p className="mt-1 text-sm text-muted">Set 2 · Target: 10 reps · 135 lbs</p>
      </div>
      <div className="px-6 py-8 text-center">
        <p className="text-sm font-semibold text-accent">REP 4</p>
        <p className="mt-4 text-6xl font-bold tabular-nums">3</p>
        <p className="mt-1 text-sm text-muted">completed reps</p>
        <p className="mt-8 text-3xl font-bold">LOWER</p>
        <p className="mt-2 text-sm text-muted">Controlled eccentric</p>
        <p className="mt-4 text-7xl font-bold tabular-nums text-accent">2</p>
        <p className="mt-7 flex items-center justify-center gap-2 text-sm text-muted">
          <span className="size-2 rounded-full bg-accent" />
          Listening for “stop”
        </p>
      </div>
      <div className="border-t border-edge p-5">
        <div className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 text-sm font-semibold text-danger">
          <span className="flex size-7 items-center justify-center rounded-md bg-danger/15">
            <Play className="size-3 fill-current" aria-hidden="true" />
          </span>
          Stop Set
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-accent/30 bg-surface px-6 py-12 text-center shadow-xl shadow-accent/5 sm:px-12 sm:py-16">
          <Dumbbell className="mx-auto size-8 text-accent" aria-hidden="true" />
          <h2 className="mx-auto mt-5 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to build your next training week?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-muted">
            Start with the way you actually train, then make the plan yours.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary min-h-12 px-5 text-base">
              Create your account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className="btn-ghost min-h-12 px-5 text-base">Log in</Link>
          </div>
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
        <p className="text-muted">Plan your week. Log the work. Keep moving.</p>
        <p className="text-muted">© {new Date().getFullYear()} RepCadence</p>
      </div>
    </footer>
  )
}
