'use client'

import { useState, useRef, useEffect } from 'react'
import { Dumbbell, Activity, Calendar, Database, Settings, User, LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isActive = (path: string) => pathname === path

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

      {/* Settings Dropdown Area */}
      <div className="mt-auto relative pb-4" ref={dropdownRef}>
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`p-3 rounded-xl transition-all ${isSettingsOpen || isActive('/settings') ? 'bg-neutral-800/50 text-cyan-400' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'}`}
        >
          <Settings className="w-6 h-6" />
        </button>

        {isSettingsOpen && (
          <div className="absolute left-16 bottom-4 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl shadow-black overflow-hidden z-50 animate-in fade-in slide-in-from-left-2">
            <div className="p-2">
              <Link 
                href="/settings"
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-neutral-300 hover:text-cyan-400 hover:bg-neutral-800/50 rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Personal Information
              </Link>
              <div className="h-px bg-neutral-800 my-1 mx-2"></div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
