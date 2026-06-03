'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Member } from '@/types'
import { getStaticMembers, applyLocalStorage } from '@/lib/members-static'

const UNITS = ['USTP', 'XU', 'Staffer', 'UC', 'CYA High', 'Butuan', 'Valencia'] as const

const UNIT_THEME: Record<string, { neon: string; neonBg: string; neonBorder: string; neonText: string }> = {
  USTP:       { neon: '#ffe033', neonBg: 'rgba(255,224,51,0.07)',   neonBorder: 'rgba(255,224,51,0.35)',   neonText: 'text-yellow-300'  },
  XU:         { neon: '#3b9eff', neonBg: 'rgba(59,158,255,0.07)',   neonBorder: 'rgba(59,158,255,0.35)',   neonText: 'text-blue-400'    },
  Staffer:    { neon: '#bf7fff', neonBg: 'rgba(191,127,255,0.07)', neonBorder: 'rgba(191,127,255,0.35)', neonText: 'text-violet-400'  },
  UC:         { neon: '#00ff88', neonBg: 'rgba(0,255,136,0.07)',    neonBorder: 'rgba(0,255,136,0.35)',    neonText: 'text-emerald-400' },
  'CYA High': { neon: '#ff9933', neonBg: 'rgba(255,153,51,0.07)',  neonBorder: 'rgba(255,153,51,0.35)',  neonText: 'text-orange-400'  },
  Butuan:     { neon: '#ff3366', neonBg: 'rgba(255,51,102,0.07)',  neonBorder: 'rgba(255,51,102,0.35)',  neonText: 'text-rose-400'    },
  Valencia:   { neon: '#00e5cc', neonBg: 'rgba(0,229,204,0.07)',   neonBorder: 'rgba(0,229,204,0.35)',   neonText: 'text-teal-300'    },
}

const CORRECT_PIN = '1567'

export default function BusesPage() {
  const [members, setMembers]         = useState<Member[]>(() => getStaticMembers())
  const [synced, setSynced]           = useState(false)
  const [updatingId, setUpdatingId]   = useState<string | null>(null)
  const [pinVerified, setPinVerified] = useState(false)
  const [pinPending, setPinPending]   = useState<(() => void) | null>(null)
  const [search, setSearch]           = useState('')

  useEffect(() => {
    setMembers(prev => applyLocalStorage(prev))
    if (sessionStorage.getItem('pin-ok') === '1') setPinVerified(true)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => setSynced(true), 3000)
    fetch('/api/members', { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMembers(data)
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timeout); setSynced(true) })
  }, [])

  function requirePin(cb: () => void) {
    if (pinVerified) { cb(); return }
    setPinPending(() => cb)
  }

  async function changeBus(member: Member, bus: 'Bus 1' | 'Bus 2') {
    if (member.bus === bus) return
    requirePin(async () => {
      setUpdatingId(member.id)
      // Optimistic
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, bus } : m))
      try {
        const res = await fetch(`/api/members/${member.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus }),
        })
        if (!res.ok) {
          // Revert
          setMembers(prev => prev.map(m => m.id === member.id ? { ...m, bus: member.bus } : m))
        }
      } catch {
        setMembers(prev => prev.map(m => m.id === member.id ? { ...m, bus: member.bus } : m))
      } finally {
        setUpdatingId(null)
      }
    })
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const bus1Count = members.filter(m => m.bus === 'Bus 1').length
  const bus2Count = members.filter(m => m.bus === 'Bus 2').length

  return (
    <main className="min-h-screen bg-[#050a14] bg-grid flex flex-col">

      {/* ── Header ── */}
      <div className="relative overflow-hidden scanline px-4 pt-10 pb-5 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(0,220,255,0.15)', background: 'linear-gradient(to bottom, rgba(0,220,255,0.04), transparent)' }}>
        <span className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/40" />
        <span className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/40" />

        <div className="max-w-lg mx-auto">
          <Link href="/" className="font-mono-data text-xs tracking-widest text-slate-500 hover:text-slate-300 transition-colors inline-block mb-3">
            ‹ HOME
          </Link>
          <h1 className="text-3xl font-black text-white tracking-tight">
            BUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">ASSIGNMENT</span>
          </h1>
          <p className="font-mono-data text-xs text-slate-600 tracking-[0.2em] mt-0.5">MANAGE BUS ALLOCATION</p>

          {/* Bus summary */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="glass rounded-xl p-3 text-center"
              style={{ border: '1px solid rgba(59,158,255,0.3)' }}>
              <p className="font-mono-data text-2xl font-black text-blue-400">{bus1Count}</p>
              <p className="font-mono-data text-[10px] text-slate-500 tracking-widest mt-0.5">🚌 BUS 1</p>
            </div>
            <div className="glass rounded-xl p-3 text-center"
              style={{ border: '1px solid rgba(255,153,51,0.3)' }}>
              <p className="font-mono-data text-2xl font-black text-orange-400">{bus2Count}</p>
              <p className="font-mono-data text-[10px] text-slate-500 tracking-widest mt-0.5">🚌 BUS 2</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="max-w-lg mx-auto w-full px-4 py-3 flex-shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm select-none">⌕</span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search member..."
            className="w-full pl-8 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-700 font-mono-data"
          />
        </div>
        {!synced && (
          <p className="font-mono-data text-[10px] text-slate-600 tracking-widest text-center mt-2">LOADING FROM SERVER…</p>
        )}
      </div>

      {/* ── Member list grouped by unit ── */}
      <div className="max-w-lg mx-auto w-full px-4 pb-10 flex-1 overflow-y-auto space-y-5">
        {UNITS.map(unit => {
          const unitMembers = filtered.filter(m => m.unit === unit)
          if (unitMembers.length === 0) return null
          const T = UNIT_THEME[unit]

          return (
            <section key={unit}>
              {/* Unit heading */}
              <div className="flex items-center gap-2 mb-2">
                <span className={`font-mono-data font-black text-sm ${T.neonText}`}
                  style={{ textShadow: `0 0 10px ${T.neon}60` }}>
                  {unit}
                </span>
                <span className="font-mono-data text-[10px] text-slate-600">{unitMembers.length} members</span>
              </div>
              <div className="h-px mb-2.5" style={{ background: `linear-gradient(to right, ${T.neon}50, transparent)` }} />

              <div className="space-y-2">
                {unitMembers.map(m => {
                  const busy = updatingId === m.id
                  return (
                    <div key={m.id}
                      className="rounded-xl px-3 py-2.5 flex items-center gap-3"
                      style={{ background: T.neonBg, border: `1px solid ${T.neonBorder}` }}>

                      {/* Name */}
                      <p className="flex-1 text-sm text-white font-medium truncate min-w-0">{m.name}</p>

                      {/* Bus toggle buttons */}
                      <div className="flex gap-1.5 flex-shrink-0" style={{ opacity: busy ? 0.5 : 1 }}>
                        {(['Bus 1', 'Bus 2'] as const).map(b => {
                          const active = m.bus === b
                          return (
                            <button key={b} onClick={() => changeBus(m, b)} disabled={busy || !synced}
                              className="px-3 py-1.5 rounded-lg font-mono-data text-[11px] font-bold tracking-wide transition-all press"
                              style={active ? {
                                background: b === 'Bus 1' ? 'rgba(59,158,255,0.25)' : 'rgba(255,153,51,0.25)',
                                border: `1.5px solid ${b === 'Bus 1' ? '#3b9eff' : '#ff9933'}`,
                                color: b === 'Bus 1' ? '#3b9eff' : '#ff9933',
                                boxShadow: `0 0 8px ${b === 'Bus 1' ? 'rgba(59,158,255,0.3)' : 'rgba(255,153,51,0.3)'}`,
                              } : {
                                background: 'rgba(15,23,42,0.6)',
                                border: '1.5px solid rgba(71,85,105,0.3)',
                                color: '#475569',
                              }}>
                              {b === 'Bus 1' ? 'B1' : 'B2'}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* ── PIN Modal ── */}
      {pinPending && (
        <PinModal
          onSuccess={() => {
            setPinVerified(true)
            sessionStorage.setItem('pin-ok', '1')
            pinPending()
            setPinPending(null)
          }}
          onClose={() => setPinPending(null)}
        />
      )}
    </main>
  )
}

/* ─── PIN Modal ─────────────────────────────────────────────────────────── */
function PinModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [digits, setDigits] = useState('')
  const [shake, setShake]   = useState(false)

  function tap(d: string) {
    if (digits.length >= 4) return
    const next = digits + d
    setDigits(next)
    if (next.length === 4) {
      if (next === CORRECT_PIN) {
        onSuccess()
      } else {
        setShake(true)
        setTimeout(() => { setDigits(''); setShake(false) }, 600)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-72 rounded-3xl p-6 text-center"
        style={{ background: '#0a1628', border: '1px solid rgba(0,220,255,0.3)', boxShadow: '0 0 40px rgba(0,220,255,0.15)' }}>
        <div className="flex items-center justify-between mb-5">
          <span />
          <p className="font-mono-data text-xs tracking-[0.3em] text-cyan-400">ENTER PIN</p>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-lg leading-none">×</button>
        </div>
        <div className={`flex justify-center gap-4 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {[0,1,2,3].map(i => (
            <div key={i} className="w-4 h-4 rounded-full border-2 transition-all"
              style={{ borderColor: '#00dcff', background: i < digits.length ? '#00dcff' : 'transparent',
                boxShadow: i < digits.length ? '0 0 8px #00dcff' : 'none' }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
            k === '' ? <div key={idx} /> :
            <button key={idx}
              onClick={() => k === '⌫' ? setDigits(d => d.slice(0,-1)) : tap(k)}
              className="h-14 rounded-2xl font-mono-data font-bold text-xl transition-all press"
              style={{ background: 'rgba(0,220,255,0.1)', border: '1px solid rgba(0,220,255,0.25)',
                color: k === '⌫' ? '#94a3b8' : 'white' }}>
              {k}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
