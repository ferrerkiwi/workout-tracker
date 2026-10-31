'use client'

import {
  CalendarDays,
  History,
  LayoutDashboard,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { BrandMark } from '@/components/brand-mark'

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/plan', label: 'Plan', icon: CalendarDays },
  { href: '/history', label: 'History', icon: History },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    const update = () => document.documentElement.style.setProperty('--mobile-nav-height',
      window.matchMedia('(min-width: 640px)').matches ? '0px' : `${nav.getBoundingClientRect().height}px`)
    const observer = new ResizeObserver(update)
    observer.observe(nav)
    window.addEventListener('resize', update)
    update()
    return () => { observer.disconnect(); window.removeEventListener('resize', update); document.documentElement.style.removeProperty('--mobile-nav-height') }
  }, [])

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-[repeat(auto-fit,minmax(min(100%,4.25rem),1fr))] items-center justify-around
                 border-t border-edge bg-surface/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]
                 sm:flex sm:inset-y-0 sm:right-auto sm:left-0 sm:w-[72px] sm:flex-col
                 sm:justify-start sm:gap-1 sm:border-t-0 sm:border-r sm:py-4"
    >
      <span className="mb-4 hidden size-10 items-center justify-center sm:flex">
        <BrandMark size={40} className="rounded-lg" />
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
            className={`group relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 transition-colors sm:size-11 sm:min-h-11 sm:flex-none
              ${
                active
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:bg-surface-2 hover:text-foreground'
              }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden="true" />
            <span className="w-full text-center text-[0.6875rem] leading-tight font-medium whitespace-nowrap sm:hidden">{label}</span>
            <span
              className="pointer-events-none absolute left-full z-30 ml-2 hidden
                         whitespace-nowrap rounded-md border border-edge bg-surface-2
                         px-2.5 py-1.5 text-xs font-medium opacity-0 transition-opacity
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
