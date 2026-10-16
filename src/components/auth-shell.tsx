import type { ReactNode } from 'react'
import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            aria-label="RepCadence home"
            className="mb-2 inline-flex flex-col items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            <BrandMark size={48} className="rounded-lg" />
            <span className="mt-4 text-sm font-semibold text-accent">
              RepCadence
            </span>
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="card">{children}</div>

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  )
}
