'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const UNITS = ['USTP', 'XU', 'Staffer', 'UC', 'Butuan'] as const

const UNIT_STYLE: Record<string, { border: string; badge: string; text: string; dot: string }> = {
  USTP:    { border: 'border-blue-300',   badge: 'bg-blue-600',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  XU:      { border: 'border-green-300',  badge: 'bg-green-600',  text: 'text-green-700',  dot: 'bg-green-500' },
  Staffer: { border: 'border-purple-300', badge: 'bg-purple-600', text: 'text-purple-700', dot: 'bg-purple-500' },
  UC:      { border: 'border-orange-300', badge: 'bg-orange-500', text: 'text-orange-700', dot: 'bg-orange-500' },
  Butuan:  { border: 'border-red-300',    badge: 'bg-red-600',    text: 'text-red-700',    dot: 'bg-red-500' },
}

interface UnitStats {
  total: number
  june4_riding: number
  june4_not: number
  june7_riding: number
  june7_not: number
}

export default function HomePage() {
  const [stats, setStats] = useState<Record<string, UnitStats>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const res = await fetch('/api/members')
      const members = await res.json()
      if (!Array.isArray(members)) return

      const unitStats: Record<string, UnitStats> = {}
      for (const unit of UNITS) {
        const um = members.filter((m: { unit: string }) => m.unit === unit)
        unitStats[unit] = {
          total: um.length,
          june4_riding: um.filter((m: { june4_status: string }) => m.june4_status === 'riding').length,
          june4_not:    um.filter((m: { june4_status: string }) => m.june4_status === 'not_going').length,
          june7_riding: um.filter((m: { june7_status: string }) => m.june7_status === 'riding').length,
          june7_not:    um.filter((m: { june7_status: string }) => m.june7_status === 'not_going').length,
        }
      }
      setStats(unitStats)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const totalRiding4 = Object.values(stats).reduce((s, u) => s + u.june4_riding, 0)
  const totalRiding7 = Object.values(stats).reduce((s, u) => s + u.june7_riding, 0)
  const totalAll     = Object.values(stats).reduce((s, u) => s + u.total, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-4 pt-10 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="text-5xl mb-3">🚌</div>
          <h1 className="text-2xl font-bold leading-tight">CYA Mindanao Conference</h1>
          <p className="text-blue-200 text-sm mt-1">Bus Attendance Monitor</p>

          {/* Summary pills */}
          {!loading && totalAll > 0 && (
            <div className="flex justify-center gap-3 mt-5 flex-wrap">
              <div className="bg-white/15 rounded-full px-4 py-1.5 text-sm">
                <span className="font-semibold">{totalAll}</span> total
              </div>
              <div className="bg-green-500/30 rounded-full px-4 py-1.5 text-sm">
                🚌 Jun 4: <span className="font-semibold">{totalRiding4}</span>
              </div>
              <div className="bg-green-500/30 rounded-full px-4 py-1.5 text-sm">
                🏠 Jun 7: <span className="font-semibold">{totalRiding7}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Select Unit</p>

        {UNITS.map((unit) => {
          const s = stats[unit]
          const style = UNIT_STYLE[unit]
          return (
            <Link key={unit} href={`/${unit}`}>
              <div className={`bg-white rounded-2xl border-2 ${style.border} p-4 flex items-center gap-4 active:scale-95 transition-transform shadow-sm cursor-pointer`}>
                <div className={`w-11 h-11 rounded-xl ${style.badge} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {unit.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className={`font-bold text-lg ${style.text}`}>{unit}</h2>
                    {!loading && s && (
                      <span className="text-xs text-gray-400">{s.total} member{s.total !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {!loading && s && s.total > 0 && (
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-500">
                        Jun 4: <span className="text-green-600 font-medium">{s.june4_riding} riding</span>
                        {s.june4_not > 0 && <span className="text-red-500"> · {s.june4_not} not going</span>}
                      </span>
                    </div>
                  )}
                  {!loading && s && s.total > 0 && (
                    <div className="flex gap-3">
                      <span className="text-xs text-gray-500">
                        Jun 7: <span className="text-green-600 font-medium">{s.june7_riding} riding</span>
                        {s.june7_not > 0 && <span className="text-red-500"> · {s.june7_not} not going</span>}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </Link>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 pb-8">
        June 4 (Going) &nbsp;·&nbsp; June 7 (Home)
      </p>
    </main>
  )
}
