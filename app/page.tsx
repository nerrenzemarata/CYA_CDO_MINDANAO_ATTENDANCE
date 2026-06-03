'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { getStaticMembers, applyLocalStorage } from '@/lib/members-static'

const UNITS = ['USTP', 'XU', 'Staffer', 'UC', 'CYA High', 'Butuan', 'Valencia'] as const

const UNIT_BUS: Record<string, string> = {
  USTP: '🚌 Bus 1', XU: '🚌 Bus 1', Staffer: '🚌 Bus 1 & 2',
  UC: '🚌 Bus 2', 'CYA High': '🚌 Bus 2', Butuan: '🚌 Bus 2', Valencia: '🚌 Bus 2',
}

const UNIT_THEME: Record<string, {
  neon: string; neonBg: string; neonBorder: string; neonText: string
  neonGlow: string; label: string; abbr: string
}> = {
  USTP:      { neon: '#ffe033', neonBg: 'rgba(255,224,51,0.08)',   neonBorder: 'rgba(255,224,51,0.35)',   neonText: 'text-yellow-300',  neonGlow: 'shadow-yellow-500/20',  label: 'USTP',     abbr: 'US' },
  XU:        { neon: '#3b9eff', neonBg: 'rgba(59,158,255,0.08)',   neonBorder: 'rgba(59,158,255,0.35)',   neonText: 'text-blue-400',    neonGlow: 'shadow-blue-500/20',    label: 'XU',       abbr: 'XU' },
  Staffer:   { neon: '#bf7fff', neonBg: 'rgba(191,127,255,0.08)', neonBorder: 'rgba(191,127,255,0.35)', neonText: 'text-violet-400',  neonGlow: 'shadow-violet-500/20',  label: 'Staffer',  abbr: 'ST' },
  UC:        { neon: '#00ff88', neonBg: 'rgba(0,255,136,0.08)',    neonBorder: 'rgba(0,255,136,0.35)',    neonText: 'text-emerald-400', neonGlow: 'shadow-emerald-500/20', label: 'UC',       abbr: 'UC' },
  'CYA High':{ neon: '#ff9933', neonBg: 'rgba(255,153,51,0.08)',  neonBorder: 'rgba(255,153,51,0.35)',  neonText: 'text-orange-400',  neonGlow: 'shadow-orange-500/20',  label: 'CYA High', abbr: 'CH' },
  Butuan:    { neon: '#ff3366', neonBg: 'rgba(255,51,102,0.08)',  neonBorder: 'rgba(255,51,102,0.35)',  neonText: 'text-rose-400',    neonGlow: 'shadow-rose-500/20',    label: 'Butuan',   abbr: 'BT' },
  Valencia:  { neon: '#00e5cc', neonBg: 'rgba(0,229,204,0.08)',  neonBorder: 'rgba(0,229,204,0.35)',  neonText: 'text-teal-300',    neonGlow: 'shadow-teal-500/20',    label: 'Valencia', abbr: 'VL' },
}

interface UnitStats {
  total: number; june4_present: number; june4_absent: number
  june7_present: number; june7_absent: number
}

function computeStats(members: ReturnType<typeof getStaticMembers>): Record<string, UnitStats> {
  const s: Record<string, UnitStats> = {}
  for (const unit of UNITS) {
    const um = members.filter(m => m.unit === unit)
    s[unit] = {
      total:         um.length,
      june4_present: um.filter(m => m.june4_status === 'riding').length,
      june4_absent:  um.filter(m => m.june4_status === 'not_going').length,
      june7_present: um.filter(m => m.june7_status === 'riding').length,
      june7_absent:  um.filter(m => m.june7_status === 'not_going').length,
    }
  }
  return s
}

export default function HomePage() {
  const [members, setMembers] = useState(() => getStaticMembers())
  const [loading, setLoading] = useState(false)

  // Apply localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setMembers(prev => applyLocalStorage(prev))
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000)
    fetch('/api/members', { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const hasRealData = data.some((m: { june4_status: string; june7_status: string }) =>
          m.june4_status === 'riding' || m.june7_status === 'riding'
        )
        setMembers(hasRealData ? data : applyLocalStorage(data))
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setLoading(false) })
  }, [])

  const stats = computeStats(members)
  const totalAll      = members.length
  const totalPresent4 = Object.values(stats).reduce((a, u) => a + u.june4_present, 0)
  const totalPresent7 = Object.values(stats).reduce((a, u) => a + u.june7_present, 0)

  return (
    <main className="min-h-screen bg-[#050a14] bg-grid">

      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden scanline px-4 pt-14 pb-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-cyan-950/10 to-[#050a14]" />

        {/* Corner accents */}
        <span className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-cyan-500/60" />
        <span className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-cyan-500/60" />
        <span className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-cyan-500/60" />
        <span className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-cyan-500/60" />

        <div className="relative max-w-lg mx-auto text-center">
          <p className="font-mono-data text-cyan-500/60 text-xs tracking-[0.3em] mb-3">
            SYSTEM ONLINE · CDO-MINCON-2026
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
            CYA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 glow-cyan">CDO</span>
            <br />
            <span style={{ background: 'linear-gradient(to right, #15803d, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Mindanao Conference</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono-data tracking-widest">
            ATTENDANCE MONITORING
          </p>

          {totalAll > 0 && (
            <div className="mt-6 grid grid-cols-3 gap-2">
              {[
                { label: 'ENROLLED', value: totalAll, color: 'text-slate-300' },
                { label: 'JUN 4 ✓',  value: totalPresent4, color: 'text-cyan-400' },
                { label: 'JUN 7 ✓',  value: totalPresent7, color: 'text-emerald-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="glass rounded-xl py-3 px-2 text-center">
                  <p className={`text-2xl font-black font-mono-data ${color}`}>{value}</p>
                  <p className="text-[9px] text-slate-600 tracking-widest font-mono-data mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Unit Cards ── */}
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-3">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono-data text-[10px] text-slate-600 tracking-[0.25em]">
            SELECT UNIT
          </p>
          <div className="flex gap-2">
            <Link href="/buses"
              className="font-mono-data text-[10px] tracking-widest px-3 py-1.5 rounded-lg border transition-all"
              style={{ background: 'rgba(0,220,255,0.05)', border: '1px solid rgba(0,220,255,0.25)', color: '#00dcff' }}>
              🚌 BUSES ›
            </Link>
            <Link href="/all"
              className="font-mono-data text-[10px] tracking-widest px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              ☰ ALL ›
            </Link>
          </div>
        </div>

        {UNITS.map(unit => {
          const s = stats[unit] ?? { total: 0, june4_present: 0, june4_absent: 0, june7_present: 0, june7_absent: 0 }
          const t = UNIT_THEME[unit]
          return (
            <Link key={unit} href={`/${unit}`}>
              <div
                className="press relative rounded-2xl overflow-hidden cursor-pointer"
                style={{
                  background: t.neonBg,
                  border: `1px solid ${t.neonBorder}`,
                  boxShadow: `0 0 20px ${t.neonBg}, inset 0 0 20px rgba(0,0,0,0.3)`,
                }}
              >
                {/* Diagonal accent stripe */}
                <div
                  className="absolute top-0 right-0 w-24 h-full opacity-10 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, transparent 40%, ${t.neon})` }}
                />

                <div className="relative flex items-center gap-4 px-4 py-4">
                  {/* Abbr badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm font-mono-data"
                    style={{ border: `1px solid ${t.neonBorder}`, color: t.neon, background: `${t.neonBg}` }}
                  >
                    {t.abbr}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className={`font-black text-xl ${t.neonText}`}>{unit}</h2>
                      <span className="font-mono-data font-black text-base px-2.5 py-0.5 rounded-lg border"
                        style={{ color: t.neon, borderColor: t.neonBorder, background: t.neonBg, textShadow: `0 0 10px ${t.neon}80` }}>
                        {UNIT_BUS[unit] ?? ''}
                      </span>
                      <span className="font-mono-data text-xs text-slate-600">{s.total} pax</span>
                    </div>
                    {s.total > 0 && (
                      <div className="flex gap-4 mt-0.5">
                        <span className="font-mono-data text-[11px] text-slate-500">
                          J4: <span className="text-cyan-400">{s.june4_present}✓</span>
                          {s.june4_absent > 0 && <span className="text-rose-500"> {s.june4_absent}✗</span>}
                        </span>
                        <span className="font-mono-data text-[11px] text-slate-500">
                          J7: <span className="text-emerald-400">{s.june7_present}✓</span>
                          {s.june7_absent > 0 && <span className="text-rose-500"> {s.june7_absent}✗</span>}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <span style={{ color: t.neon }} className="text-xl opacity-60 flex-shrink-0">›</span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      <p className="text-center font-mono-data text-[10px] text-slate-700 tracking-widest pb-8">
        JUN 04 DEPARTURE · JUN 07 RETURN
      </p>
    </main>
  )
}
