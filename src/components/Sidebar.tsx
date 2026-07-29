'use client'

import { Dumbbell, Activity, Calendar, Database } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <div className="hidden md:flex flex-col w-20 border-r border-neutral-800 bg-neutral-900/20 py-8 items-center gap-8 min-h-screen">
      <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
        <Dumbbell className="w-6 h-6 text-white" />
      </div>
      <div className="flex flex-col gap-6">
        <Link 
          href="/dashboard"
          className={`p-3 rounded-xl transition-all ${isActive('/dashboard') ? 'bg-neutral-800/50 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'}`}
        >
          <Activity className="w-6 h-6" />
        </Link>
        <Link 
          href="/calendar"
          className={`p-3 rounded-xl transition-all ${isActive('/calendar') ? 'bg-neutral-800/50 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'}`}
        >
          <Calendar className="w-6 h-6" />
        </Link>
        <Link 
          href="/database"
          className={`p-3 rounded-xl transition-all ${isActive('/database') ? 'bg-neutral-800/50 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'}`}
        >
          <Database className="w-6 h-6" />
        </Link>
      </div>
    </div>
  )
}
