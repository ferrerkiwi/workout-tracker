'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { dateKeyInTimeZone, syncBrowserTimeZone } from '@/lib/time-zone'

export function TimeZoneSync() {
  const router = useRouter()
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    let day = dateKeyInTimeZone(new Date(), zone)
    function sync() {
      if (document.hidden) return
      const nextDay = dateKeyInTimeZone(new Date(), Intl.DateTimeFormat().resolvedOptions().timeZone)
      const zoneChanged = syncBrowserTimeZone()
      if (zoneChanged || day !== nextDay) router.refresh()
      day = nextDay
    }
    sync()
    document.addEventListener('visibilitychange', sync)
    const timer = window.setInterval(sync, 60_000)
    return () => { document.removeEventListener('visibilitychange', sync); window.clearInterval(timer) }
  }, [router])
  return null
}
