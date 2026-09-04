import type { ReactNode } from 'react'
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
          <BrandMark size={48} className="mb-4 rounded-2xl shadow-lg shadow-black/35" />
          <p className="mb-2 text-sm font-semibold text-accent">RepCadence</p>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
        </div>

        <div className="card">{children}</div>

        <p className="mt-6 text-center text-sm text-muted">{footer}</p>
      </div>
    </main>
  )
}
