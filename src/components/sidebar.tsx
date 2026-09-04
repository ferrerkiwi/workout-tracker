'use client'

import {
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/plan', label: 'Weekly plan', icon: CalendarDays },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around
                 border-t border-edge bg-surface/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur
                 sm:inset-y-0 sm:right-auto sm:left-0 sm:w-[72px] sm:flex-col
                 sm:justify-start sm:gap-1 sm:border-t-0 sm:border-r sm:py-4"
    >
      <span className="mb-4 hidden size-10 items-center justify-center rounded-xl bg-linear-to-br from-accent to-accent-strong sm:flex">
        <Dumbbell className="size-5 text-slate-950" />
        <span className="sr-only">RepCadence</span>
      </span>

      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex size-11 items-center justify-center rounded-xl transition
              ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:bg-surface-2 hover:text-foreground'
              }`}
          >
            <Icon className="size-5" />
            <span
              className="pointer-events-none absolute left-full z-30 ml-2 hidden
                         whitespace-nowrap rounded-lg border border-edge bg-surface-2
                         px-2.5 py-1.5 text-xs font-medium opacity-0 transition
                         group-hover:opacity-100 sm:block"
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
