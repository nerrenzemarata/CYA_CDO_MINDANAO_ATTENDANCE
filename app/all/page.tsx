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
  Valencia:   { neon: '#00e5cc', neonBg: 'rgba(0,229,204,0.07)',   neonBorder: 'rgba(0,229,204,0.35)',   neonText: 'text-teal-300'    },
}

const CORRECT_PIN = '1567'

type ViewMode = 'rollcall' | 'list'

export default function AllPage() {
  const [members, setMembers]       = useState<Member[]>(() => getStaticMembers())
  const [synced, setSynced]         = useState(false)
  const [mode, setMode]             = useState<ViewMode>('list')
  const [search, setSearch]         = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Edit state
  const [editMember, setEditMember]   = useState<Member | null>(null)
  const [editName, setEditName]       = useState('')
  const [editContact, setEditContact] = useState('')
  const [editBus, setEditBus]         = useState<'Bus 1' | 'Bus 2'>('Bus 1')
  const [saving, setSaving]           = useState(false)

  // PIN state
  const [pinVerified, setPinVerified] = useState(false)
  const [pinPending, setPinPending]   = useState<(() => void) | null>(null)

  useEffect(() => {
    setMembers(prev => applyLocalStorage(prev))
    if (sessionStorage.getItem('pin-ok') === '1') setPinVerified(true)
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

  function requirePin(cb: () => void) {
    if (pinVerified) { cb(); return }
    setPinPending(() => cb)
  }

  function guardedToggle(memberId: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) {
    requirePin(() => toggleStatus(memberId, trip, cur))
  }

  async function toggleStatus(memberId: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) {
    const next: TripStatus = cur === 'riding' ? 'not_going' : 'riding'
    const memberName = members.find(m => m.id === memberId)?.name ?? ''
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
    } catch { /* keep localStorage */ } finally { setUpdatingId(null) }
  }

  async function saveEdit() {
    if (!editMember || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${editMember.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), contact_number: editContact.trim(), bus: editBus }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === editMember.id
          ? { ...m, name: editName.trim(), contact_number: editContact.trim(), bus: editBus } : m))
        setEditMember(null)
      }
    } finally { setSaving(false) }
  }

  function openEdit(m: Member) {
    requirePin(() => {
      setEditMember(m)
      setEditName(m.name)
      setEditContact(m.contact_number ?? '')
      setEditBus(m.bus ?? 'Bus 1')
    })
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.contact_number || '').includes(search)
  )

  const totalP4 = members.filter(m => m.june4_status === 'riding').length
  const totalP7 = members.filter(m => m.june7_status === 'riding').length

  // Theme for the edit sheet — use the editing member's unit color
  const editT = editMember ? UNIT_THEME[editMember.unit] : UNIT_THEME['USTP']

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
                  <span className="font-mono-data text-xs text-slate-600">{unitMembers.length} members</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono-data text-[11px]" style={{ color: T.neon }}>J4: {p4}✓</span>
                  <span className="font-mono-data text-[11px]" style={{ color: T.neon }}>J7: {p7}✓</span>
                  <Link href={`/${unit}`} className="font-mono-data text-[10px] text-slate-600 hover:text-slate-400 transition-colors tracking-widest">
                    OPEN ›
                  </Link>
                </div>
              </div>

              <div className="h-px mb-3" style={{ background: `linear-gradient(to right, ${T.neon}40, transparent)` }} />

              {mode === 'rollcall' ? (
                <div className="space-y-2">
                  {unitMembers.map((m, i) => (
                    <RollCallRow key={m.id} member={m} index={i + 1} updatingId={updatingId} synced={synced}
                      T={T} onToggle={guardedToggle} onEdit={openEdit} />
                  ))}
                </div>
              ) : (
                <CompactTable members={unitMembers} updatingId={updatingId} synced={synced}
                  T={T} onToggle={guardedToggle} onEdit={openEdit} />
              )}
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

      {/* ── Edit Sheet ── */}
      {editMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end justify-center z-50"
          onClick={e => { if (e.target === e.currentTarget) setEditMember(null) }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{ background: '#0a1628', border: `1px solid ${editT.neon}30`, borderBottom: 'none',
              boxShadow: `0 -20px 60px ${editT.neon}15` }}>
            <div className="w-10 h-0.5 rounded-full mx-auto mb-6" style={{ background: editT.neon, opacity: 0.4 }} />
            <p className="font-mono-data text-sm tracking-[0.25em] mb-5" style={{ color: editT.neon }}>EDIT MEMBER</p>

            <label className="font-mono-data text-[10px] tracking-widest text-slate-600 block mb-1.5">FULL NAME *</label>
            <input autoFocus type="text" value={editName} onChange={e => setEditName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono-data text-sm mb-3"
            />

            <label className="font-mono-data text-[10px] tracking-widest text-slate-600 block mb-1.5">CONTACT NUMBER</label>
            <input type="tel" value={editContact} onChange={e => setEditContact(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono-data text-sm mb-3"
            />

            <label className="font-mono-data text-[10px] tracking-widest text-slate-600 block mb-1.5">BUS ASSIGNMENT</label>
            <div className="flex gap-2 mb-5">
              {(['Bus 1', 'Bus 2'] as const).map(b => (
                <button key={b} type="button" onClick={() => setEditBus(b)}
                  className="flex-1 py-3 rounded-xl font-mono-data text-sm font-bold tracking-widest border-2 transition-all"
                  style={editBus === b ? {
                    background: b === 'Bus 1' ? 'rgba(59,158,255,0.15)' : 'rgba(255,153,51,0.15)',
                    borderColor: b === 'Bus 1' ? '#3b9eff' : '#ff9933',
                    color: b === 'Bus 1' ? '#3b9eff' : '#ff9933',
                    boxShadow: `0 0 12px ${b === 'Bus 1' ? 'rgba(59,158,255,0.3)' : 'rgba(255,153,51,0.3)'}`,
                  } : {
                    background: 'rgba(15,23,42,0.5)',
                    borderColor: 'rgba(71,85,105,0.4)',
                    color: '#475569',
                  }}>
                  🚌 {b}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditMember(null)}
                className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-500 font-mono-data text-sm tracking-widest hover:border-slate-500 transition-colors">
                CANCEL
              </button>
              <button onClick={saveEdit} disabled={saving || !editName.trim()}
                className="flex-1 py-3 rounded-xl text-white font-mono-data text-sm tracking-widest disabled:opacity-30 transition-colors press"
                style={{ background: editT.neon + '22', border: `1px solid ${editT.neon}50`, color: editT.neon }}>
                {saving ? 'SAVING…' : 'SAVE'}
              </button>
            </div>
          </div>
        </div>
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

/* ─── Roll Call Row ─────────────────────────────────────────────────────── */
function RollCallRow({ member, index, updatingId, synced, T, onToggle, onEdit }: {
  member: Member; index: number; updatingId: string | null; synced: boolean
  T: { neon: string; neonBg: string; neonBorder: string; neonText: string }
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
  onEdit: (m: Member) => void
}) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex items-center gap-3"
      style={{ background: T.neonBg, border: `1px solid ${T.neonBorder}` }}>
      <span className="font-mono-data text-[10px] flex-shrink-0" style={{ color: T.neon, opacity: 0.5 }}>
        #{String(index).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-semibold text-white truncate">{member.name}</p>
          {member.bus && (
            <span className="font-mono-data text-[8px] px-1 py-0.5 rounded border flex-shrink-0"
              style={{ color: member.bus === 'Bus 1' ? '#3b9eff' : '#ff9933',
                borderColor: member.bus === 'Bus 1' ? 'rgba(59,158,255,0.4)' : 'rgba(255,153,51,0.4)',
                background: member.bus === 'Bus 1' ? 'rgba(59,158,255,0.1)' : 'rgba(255,153,51,0.1)' }}>
              {member.bus}
            </span>
          )}
        </div>
        {member.contact_number && (
          <a href={`tel:${member.contact_number}`}
            className="font-mono-data text-[10px] text-slate-500 hover:text-emerald-400 transition-colors">
            📞 {member.contact_number}
          </a>
        )}
      </div>
      <button onClick={() => onEdit(member)}
        className="p-1.5 text-slate-700 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors text-sm flex-shrink-0">
        ✏️
      </button>
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

/* ─── Compact Table ─────────────────────────────────────────────────────── */
function CompactTable({ members, updatingId, synced, T, onToggle, onEdit }: {
  members: Member[]; updatingId: string | null; synced: boolean
  T: { neon: string; neonBg: string; neonBorder: string; neonText: string }
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
  onEdit: (m: Member) => void
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.neonBorder}` }}>
      <div className="grid grid-cols-[1.4rem_1fr_1.6rem_1.6rem_2.6rem_2.6rem] gap-x-2 px-3 py-1.5"
        style={{ background: T.neonBg, borderBottom: `1px solid ${T.neonBorder}` }}>
        {['#','NAME','📞','✏️','J4','J7'].map(h => (
          <span key={h} className="font-mono-data text-[9px] text-slate-600 text-center first:text-left">{h}</span>
        ))}
      </div>

      {members.map((m, i) => {
        const p4 = m.june4_status === 'riding'
        const p7 = m.june7_status === 'riding'
        return (
          <div key={m.id}
            className="grid grid-cols-[1.4rem_1fr_1.6rem_1.6rem_2.6rem_2.6rem] gap-x-2 px-3 py-1.5 items-center border-b border-slate-800/50 last:border-b-0"
            style={i % 2 === 0 ? { background: 'rgba(255,255,255,0.01)' } : {}}>
            <span className="font-mono-data text-[9px] text-slate-700">{String(i+1).padStart(2,'0')}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <p className="text-xs text-slate-200 font-medium truncate leading-tight">{m.name}</p>
                {m.bus && (
                  <span className="font-mono-data text-[8px] px-1 rounded border flex-shrink-0"
                    style={{ color: m.bus === 'Bus 1' ? '#3b9eff' : '#ff9933',
                      borderColor: m.bus === 'Bus 1' ? 'rgba(59,158,255,0.4)' : 'rgba(255,153,51,0.4)',
                      background: m.bus === 'Bus 1' ? 'rgba(59,158,255,0.1)' : 'rgba(255,153,51,0.1)' }}>
                    {m.bus}
                  </span>
                )}
              </div>
              {m.contact_number && (
                <p className="font-mono-data text-[9px] text-slate-600 truncate">{m.contact_number}</p>
              )}
            </div>
            <div className="flex items-center justify-center">
              {m.contact_number
                ? <a href={`tel:${m.contact_number}`} className="text-slate-600 hover:text-emerald-400 transition-colors text-xs">📞</a>
                : <span className="text-slate-800 text-xs">—</span>}
            </div>
            <button onClick={() => onEdit(m)}
              className="flex items-center justify-center text-slate-700 hover:text-blue-400 transition-colors text-xs">
              ✏️
            </button>
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
