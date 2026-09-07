import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { addDays, formatWeekRange, fromDateKey, toDateKey } from '@/lib/week'

function planHref(weekStart: string, currentWeekStart: string) {
  return weekStart === currentWeekStart ? '/plan' : `/plan?week=${weekStart}`
}

export function WeekNavigator({
  weekStart,
  currentWeekStart,
}: {
  weekStart: string
  currentWeekStart: string
}) {
  const previousWeek = toDateKey(addDays(fromDateKey(weekStart), -7))
  const nextWeek = toDateKey(addDays(fromDateKey(weekStart), 7))
  const isCurrentWeek = weekStart === currentWeekStart

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center rounded-xl border border-edge bg-surface">
        <Link
          href={planHref(previousWeek, currentWeekStart)}
          aria-label="Previous week"
          className="flex size-11 shrink-0 items-center justify-center rounded-l-xl text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="min-w-0 flex-1 px-2 text-center text-sm font-semibold sm:min-w-60 sm:text-base">
          {formatWeekRange(weekStart)}
        </p>
        <Link
          href={planHref(nextWeek, currentWeekStart)}
          aria-label="Next week"
          className="flex size-11 shrink-0 items-center justify-center rounded-r-xl text-muted transition hover:bg-surface-2 hover:text-foreground"
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>

      {!isCurrentWeek && (
        <Link href="/plan" className="btn-ghost shrink-0 self-start sm:self-auto">
          This week
        </Link>
      )}
    </div>
  )
}
