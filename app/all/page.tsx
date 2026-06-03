'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Member, TripStatus } from '@/types'
import { getStaticMembers, applyLocalStorage } from '@/lib/members-static'
import { saveStatus, saveStatusMapFromMembers } from '@/lib/local-storage'

const UNITS = ['USTP', 'XU', 'Staffer', 'UC', 'CYA High', 'Butuan', 'Valencia'] as const

const UNIT_BUS: Record<string, string> = {
  USTP: 'Bus 1', XU: 'Bus 1', Staffer: 'Bus 1 & 2',
  UC: 'Bus 2', 'CYA High': 'Bus 2', Butuan: 'Bus 2', Valencia: 'Bus 2',
}

const UNIT_THEME: Record<string, { neon: string; neonBg: string; neonBorder: string; neonText: string }> = {
  USTP:       { neon: '#ffe033', neonBg: 'rgba(255,224,51,0.07)',   neonBorder: 'rgba(255,224,51,0.35)',   neonText: 'text-yellow-300'  },
  XU:         { neon: '#3b9eff', neonBg: 'rgba(59,158,255,0.07)',   neonBorder: 'rgba(59,158,255,0.35)',   neonText: 'text-blue-400'    },
  Staffer:    { neon: '#bf7fff', neonBg: 'rgba(191,127,255,0.07)', neonBorder: 'rgba(191,127,255,0.35)', neonText: 'text-violet-400'  },
  UC:         { neon: '#00ff88', neonBg: 'rgba(0,255,136,0.07)',    neonBorder: 'rgba(0,255,136,0.35)',    neonText: 'text-emerald-400' },
  'CYA High': { neon: '#ff9933', neonBg: 'rgba(255,153,51,0.07)',  neonBorder: 'rgba(255,153,51,0.35)',  neonText: 'text-orange-400'  },
  Butuan:     { neon: '#ff3366', neonBg: 'rgba(255,51,102,0.07)',  neonBorder: 'rgba(255,51,102,0.35)',  neonText: 'text-rose-400'    },
  Valencia:   { neon: '#00e5cc', neonBg: 'rgba(0,229,204,0.07)',  neonBorder: 'rgba(0,229,204,0.35)',  neonText: 'text-teal-300'    },
}

type ViewMode = 'rollcall' | 'list'

export default function AllPage() {
  const [members, setMembers]     = useState<Member[]>(() => getStaticMembers())
  const [synced, setSynced]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [mode, setMode]           = useState<ViewMode>('list')
  const [search, setSearch]       = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Apply localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setMembers(prev => applyLocalStorage(prev))
  }, [])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const timeout = setTimeout(() => setSynced(true), 3000)
    try {
      const res = await fetch('/api/members', { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      if (Array.isArray(data)) {
        const hasRealData = data.some((m: Member) => m.june4_status === 'riding' || m.june7_status === 'riding')
        const merged = hasRealData ? data : applyLocalStorage(data)
        setMembers(merged)
        if (hasRealData) saveStatusMapFromMembers(merged)
      }
    } catch { /* silent */ } finally { clearTimeout(timeout); setSynced(true) }
  }

  async function toggleStatus(memberId: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) {
    const next: TripStatus = cur === 'riding' ? 'not_going' : 'riding'
    const memberName = members.find(m => m.id === memberId)?.name ?? ''
    // Optimistic update — show change instantly + save to localStorage
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, [trip]: next } : m))
    saveStatus(memberName, trip, next)
    setUpdatingId(memberId + trip)
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [trip]: next }),
      })
      if (!res.ok) {
        setMembers(prev => prev.map(m => m.id === memberId ? { ...m, [trip]: cur } : m))
        saveStatus(memberName, trip, cur)
      }
    } catch {
      // Keep localStorage value — don't revert when offline
    } finally { setUpdatingId(null) }
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.contact_number || '').includes(search)
  )

  const totalP4 = members.filter(m => m.june4_status === 'riding').length
  const totalP7 = members.filter(m => m.june7_status === 'riding').length

  return (
    <main className="min-h-screen bg-[#050a14] bg-grid flex flex-col">

      {/* ── Header ── */}
      <div className="relative overflow-hidden scanline px-4 pt-10 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(to bottom, rgba(255,255,255,0.03), transparent)' }}>
        <span className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-slate-600/50" />
        <span className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-slate-600/50" />

        <div className="max-w-2xl mx-auto">
          <Link href="/" className="font-mono-data text-xs tracking-widest text-slate-500 hover:text-slate-300 transition-colors inline-block mb-3">
            ‹ HOME
          </Link>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">
                ALL <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-300 to-slate-500">UNITS</span>
              </h1>
              <p className="font-mono-data text-xs text-slate-600 tracking-[0.2em] mt-0.5">MASTER ATTENDANCE LIST</p>
            </div>
            <div className="text-right">
              <p className="font-mono-data text-2xl font-black text-white">{members.length}</p>
              <p className="font-mono-data text-[10px] text-slate-600 tracking-widest">TOTAL</p>
            </div>
          </div>

          {/* Global stats */}
          {members.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { label: 'ENROLLED', val: members.length, color: 'text-slate-300' },
                { label: 'JUN 4 ✓',  val: totalP4,        color: 'text-yellow-300' },
                { label: 'JUN 7 ✓',  val: totalP7,        color: 'text-blue-400'   },
              ].map(({ label, val, color }) => (
                <div key={label} className="glass rounded-xl py-2.5 px-3 text-center">
                  <p className={`font-mono-data text-xl font-black ${color}`}>{val}</p>
                  <p className="font-mono-data text-[9px] text-slate-600 tracking-widest mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="max-w-2xl mx-auto w-full px-4 py-3 flex gap-2 flex-shrink-0">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm select-none">⌕</span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or number..."
            className="w-full pl-8 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600 font-mono-data"
          />
        </div>

        <div className="flex rounded-xl overflow-hidden border border-slate-800 flex-shrink-0">
          {(['rollcall', 'list'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="px-3 py-2 text-sm font-mono-data font-bold tracking-wide whitespace-nowrap transition-all duration-150"
              style={{
                background: mode === m ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: mode === m ? '#e2e8f0' : '#475569',
                textShadow: mode === m ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
              }}>
              {m === 'rollcall' ? '📋 Roll Call' : '☰ List'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mode label ── */}
      <div className="max-w-2xl mx-auto w-full px-4 mb-2 flex-shrink-0 flex items-center justify-between">
        <p className="font-mono-data text-xs font-bold tracking-widest text-slate-400"
          style={{ textShadow: '0 0 8px rgba(255,255,255,0.2)' }}>
          {mode === 'rollcall' ? '📋 ROLL CALL MODE' : '☰ LIST MODE'}
        </p>
        <p className="font-mono-data text-[10px] text-slate-600 tracking-wider">
          {filtered.length} RECORDS
        </p>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto w-full px-4 pb-10 flex-1 overflow-y-auto space-y-6">
        {UNITS.map(unit => {
            const unitMembers = filtered.filter(m => m.unit === unit)
            if (unitMembers.length === 0) return null
            const T = UNIT_THEME[unit]
            const p4 = unitMembers.filter(m => m.june4_status === 'riding').length
            const p7 = unitMembers.filter(m => m.june7_status === 'riding').length

            return (
              <section key={unit}>
                {/* Unit heading */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <span className={`font-mono-data font-black text-lg ${T.neonText}`}
                      style={{ textShadow: `0 0 14px ${T.neon}60` }}>
                      {unit}
                    </span>
                    <span className="font-mono-data font-black text-base px-2.5 py-0.5 rounded-lg border"
                      style={{ color: T.neon, borderColor: T.neonBorder, background: T.neonBg, textShadow: `0 0 10px ${T.neon}80` }}>
                      🚌 {UNIT_BUS[unit]}
                    </span>
                    <span className="font-mono-data text-xs text-slate-600">
                      {unitMembers.length} members
                    </span>
                  </div>
                  {/* Mini stats */}
                  <div className="flex gap-3">
                    <span className="font-mono-data text-[11px]" style={{ color: T.neon }}>
                      J4: {p4}✓
                    </span>
                    <span className="font-mono-data text-[11px]" style={{ color: T.neon }}>
                      J7: {p7}✓
                    </span>
                    <Link href={`/${unit}`} className="font-mono-data text-[10px] text-slate-600 hover:text-slate-400 transition-colors tracking-widest">
                      OPEN ›
                    </Link>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px mb-3" style={{ background: `linear-gradient(to right, ${T.neon}40, transparent)` }} />

                {mode === 'rollcall' ? (
                  <div className="space-y-2">
                    {unitMembers.map((m, i) => (
                      <RollCallRow key={m.id} member={m} index={i + 1} updatingId={updatingId} synced={synced} T={T} onToggle={toggleStatus} />
                    ))}
                  </div>
                ) : (
                  <CompactTable members={unitMembers} updatingId={updatingId} synced={synced} T={T} onToggle={toggleStatus} />
                )}
              </section>
            )
          })}
      </div>
    </main>
  )
}

/* ─── Roll Call Row (compact card for "all" view) ─────────────────────── */
function RollCallRow({ member, index, updatingId, synced, T, onToggle }: {
  member: Member; index: number; updatingId: string | null; synced: boolean
  T: { neon: string; neonBg: string; neonBorder: string; neonText: string }
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
}) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={{ background: T.neonBg, border: `1px solid ${T.neonBorder}` }}>
      <span className="font-mono-data text-[10px] flex-shrink-0" style={{ color: T.neon, opacity: 0.5 }}>
        #{String(index).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{member.name}</p>
        {member.contact_number && (
          <a href={`tel:${member.contact_number}`}
            className="font-mono-data text-[10px] text-slate-500 hover:text-emerald-400 transition-colors">
            📞 {member.contact_number}
          </a>
        )}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {(['june4_status', 'june7_status'] as const).map(trip => {
          const present = member[trip] === 'riding'
          const busy    = updatingId === member.id + trip
          const label   = trip === 'june4_status' ? 'J4' : 'J7'
          return (
            <button key={trip} onClick={() => onToggle(member.id, trip, member[trip])}
              disabled={busy || !synced}
              className="flex flex-col items-center justify-center w-12 h-10 rounded-lg text-sm press transition-all"
              style={present
                ? { background: `${T.neon}20`, border: `1px solid ${T.neon}60`, boxShadow: `0 0 8px ${T.neon}20` }
                : { background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(71,85,105,0.3)' }}>
              <span style={{ opacity: busy ? 0.4 : 1 }}>{present ? '✅' : '⬜'}</span>
              <span className="font-mono-data text-[8px] mt-0.5" style={{ color: present ? T.neon : '#334155' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Compact Table (list mode for "all" view) ────────────────────────── */
function CompactTable({ members, updatingId, synced, T, onToggle }: {
  members: Member[]; updatingId: string | null; synced: boolean
  T: { neon: string; neonBg: string; neonBorder: string; neonText: string }
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.neonBorder}` }}>
      {/* Header */}
      <div className="grid grid-cols-[1.4rem_1fr_1.6rem_2.6rem_2.6rem] gap-x-2 px-3 py-1.5"
        style={{ background: T.neonBg, borderBottom: `1px solid ${T.neonBorder}` }}>
        {['#','NAME','📞','J4','J7'].map(h => (
          <span key={h} className="font-mono-data text-[9px] text-slate-600 text-center first:text-left">{h}</span>
        ))}
      </div>

      {members.map((m, i) => {
        const p4 = m.june4_status === 'riding'
        const p7 = m.june7_status === 'riding'
        return (
          <div key={m.id}
            className="grid grid-cols-[1.4rem_1fr_1.6rem_2.6rem_2.6rem] gap-x-2 px-3 py-1.5 items-center border-b border-slate-800/50 last:border-b-0"
            style={i % 2 === 0 ? { background: 'rgba(255,255,255,0.01)' } : {}}>
            <span className="font-mono-data text-[9px] text-slate-700">{String(i+1).padStart(2,'0')}</span>
            <div className="min-w-0">
              <p className="text-xs text-slate-200 font-medium truncate leading-tight">{m.name}</p>
              {m.contact_number && (
                <p className="font-mono-data text-[9px] text-slate-600 truncate">{m.contact_number}</p>
              )}
            </div>
            <div className="flex items-center justify-center">
              {m.contact_number
                ? <a href={`tel:${m.contact_number}`} className="text-slate-600 hover:text-emerald-400 transition-colors text-xs">📞</a>
                : <span className="text-slate-800 text-xs">—</span>}
            </div>
            {(['june4_status', 'june7_status'] as const).map(trip => {
              const present = m[trip] === 'riding'
              const busy    = updatingId === m.id + trip
              return (
                <button key={trip} onClick={() => onToggle(m.id, trip, m[trip])} disabled={busy || !synced}
                  className="flex items-center justify-center h-6 rounded-lg text-xs press transition-all"
                  style={present
                    ? { background: `${T.neon}20`, border: `1px solid ${T.neon}50` }
                    : { background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.3)' }}>
                  <span style={{ filter: present ? `drop-shadow(0 0 3px ${T.neon})` : 'none', opacity: busy ? 0.4 : 1 }}>
                    {present ? '✅' : '⬜'}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
