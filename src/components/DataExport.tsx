'use client'

import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet } from 'lucide-react'

// Dummy data representing what would be fetched from Supabase
const dummyHistory = [
  { id: 1, date: '2026-07-20', workout_name: 'Chest & Triceps', volume_lbs: 12400 },
  { id: 2, date: '2026-07-22', workout_name: 'Back & Biceps', volume_lbs: 14200 },
  { id: 3, date: '2026-07-24', workout_name: 'Legs', volume_lbs: 21000 }
]

export default function DataExport() {
  const [isOpen, setIsOpen] = useState(false)

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(dummyHistory, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout_history_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  const handleExportCSV = () => {
    const headers = ['id', 'date', 'workout_name', 'volume_lbs']
    const csvRows = [
      headers.join(','),
      ...dummyHistory.map(row => 
        headers.map(field => JSON.stringify((row as any)[field])).join(',')
      )
    ]
    const csvString = csvRows.join('\n')
    const blob = new Blob([csvString], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workout_history_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-300"
      >
        <Download className="w-4 h-4 text-cyan-400" /> Export Data
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={handleExportJSON}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors text-left text-sm text-neutral-200 border-b border-neutral-800/50"
          >
            <FileJson className="w-4 h-4 text-yellow-400" /> Export as JSON
          </button>
          <button 
            onClick={handleExportCSV}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-800 transition-colors text-left text-sm text-neutral-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export as CSV
          </button>
        </div>
      )}
    </div>
  )
}
