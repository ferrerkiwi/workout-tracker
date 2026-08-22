import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'RepCadence | Plan smarter. Train with intent.',
    template: '%s | RepCadence',
  },
  description:
    'Build a personalized weekly routine, log every set, and keep your training moving forward.',
  openGraph: {
    title: 'RepCadence | Plan smarter. Train with intent.',
    description:
      'Build a personalized weekly routine, log every set, and keep your training moving forward.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'RepCadence | Plan smarter. Train with intent.',
    description:
      'Build a personalized weekly routine, log every set, and keep your training moving forward.',
  },
}

export const viewport: Viewport = {
  themeColor: '#06080d',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
