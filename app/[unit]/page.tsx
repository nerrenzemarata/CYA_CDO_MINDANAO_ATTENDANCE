'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { Member, TripStatus } from '@/types'
import { getStaticMembers, applyLocalStorage } from '@/lib/members-static'
import { saveStatus, saveStatusMapFromMembers } from '@/lib/local-storage'

type Unit = 'USTP' | 'XU' | 'Staffer' | 'UC' | 'CYA High' | 'Butuan'
const UNITS: Unit[] = ['USTP', 'XU', 'Staffer', 'UC', 'CYA High', 'Butuan']

const UNIT_BUS: Record<string, string> = {
  USTP: '🚌 Bus 1', XU: '🚌 Bus 1', Staffer: '🚌 Bus 1 & 2',
  UC: '🚌 Bus 2', 'CYA High': '🚌 Bus 2', Butuan: '🚌 Bus 2',
}

const UNIT_THEME: Record<string, {
  neon: string; neonBg: string; neonBorder: string; neonText: string
  gradient: string; focusRing: string; btnBg: string
}> = {
  USTP:       { neon: '#ffe033', neonBg: 'rgba(255,224,51,0.08)',   neonBorder: 'rgba(255,224,51,0.4)',   neonText: 'text-yellow-300',  gradient: 'from-yellow-900/80 to-[#050a14]',  focusRing: 'focus:ring-yellow-400',  btnBg: 'bg-yellow-500 hover:bg-yellow-400'  },
  XU:         { neon: '#3b9eff', neonBg: 'rgba(59,158,255,0.08)',   neonBorder: 'rgba(59,158,255,0.4)',   neonText: 'text-blue-400',    gradient: 'from-blue-900/80 to-[#050a14]',    focusRing: 'focus:ring-blue-500',    btnBg: 'bg-blue-600 hover:bg-blue-500'      },
  Staffer:    { neon: '#bf7fff', neonBg: 'rgba(191,127,255,0.08)', neonBorder: 'rgba(191,127,255,0.4)', neonText: 'text-violet-400',  gradient: 'from-violet-900/80 to-[#050a14]',  focusRing: 'focus:ring-violet-500',  btnBg: 'bg-violet-600 hover:bg-violet-500'  },
  UC:         { neon: '#00ff88', neonBg: 'rgba(0,255,136,0.08)',    neonBorder: 'rgba(0,255,136,0.4)',    neonText: 'text-emerald-400', gradient: 'from-emerald-900/80 to-[#050a14]', focusRing: 'focus:ring-emerald-500', btnBg: 'bg-emerald-600 hover:bg-emerald-500' },
  'CYA High': { neon: '#ff9933', neonBg: 'rgba(255,153,51,0.08)',  neonBorder: 'rgba(255,153,51,0.4)',  neonText: 'text-orange-400',  gradient: 'from-orange-900/80 to-[#050a14]',  focusRing: 'focus:ring-orange-500',  btnBg: 'bg-orange-500 hover:bg-orange-400'  },
  Butuan:     { neon: '#ff3366', neonBg: 'rgba(255,51,102,0.08)',  neonBorder: 'rgba(255,51,102,0.4)',  neonText: 'text-rose-400',    gradient: 'from-rose-900/80 to-[#050a14]',    focusRing: 'focus:ring-rose-500',    btnBg: 'bg-rose-600 hover:bg-rose-500'      },
}

type ViewMode = 'rollcall' | 'list'

export default function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: unitParam } = use(params)
  const unit = unitParam as Unit

  const [members, setMembers]         = useState<Member[]>(() =>
    getStaticMembers().filter(m => m.unit === unit)
  )
  const [synced, setSynced]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [mode, setMode]               = useState<ViewMode>('rollcall')
  const [showAdd, setShowAdd]         = useState(false)
  const [newName, setNewName]         = useState('')
  const [newContact, setNewContact]   = useState('')
  const [adding, setAdding]           = useState(false)
  const [updatingId, setUpdatingId]   = useState<string | null>(null)
  const [editMember, setEditMember]   = useState<Member | null>(null)
  const [editName, setEditName]       = useState('')
  const [editContact, setEditContact] = useState('')
  const [saving, setSaving]           = useState(false)
  const [search, setSearch]           = useState('')

  if (!UNITS.includes(unit)) {
    return (
      <div className="min-h-screen bg-[#050a14] flex items-center justify-center">
        <Link href="/" className="text-cyan-400 font-mono-data">← BACK</Link>
      </div>
    )
  }

  const T = UNIT_THEME[unit]

  // Apply localStorage after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    setMembers(prev => applyLocalStorage(prev))
  }, [])

  const fetchMembers = useCallback(async () => {
    // Enable buttons after 3s regardless, so phone users aren't stuck
    const timeout = setTimeout(() => setSynced(true), 3000)
    try {
      const res = await fetch(`/api/members?unit=${unit}`, { signal: AbortSignal.timeout(5000) })
      const data = await res.json()
      if (Array.isArray(data)) {
        // If API has real attendance data, use it as truth and update localStorage.
        // If all statuses are not_going (fresh in-memory server restart), keep localStorage statuses.
        const hasRealData = data.some((m: Member) => m.june4_status === 'riding' || m.june7_status === 'riding')
        const merged = hasRealData ? data : applyLocalStorage(data)
        setMembers(merged)
        if (hasRealData) saveStatusMapFromMembers(merged)
      }
    } catch { /* silent */ } finally { clearTimeout(timeout); setSynced(true) }
  }, [unit])

  useEffect(() => { fetchMembers() }, [fetchMembers])

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

  async function addMember() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit, name: newName.trim(), contact_number: newContact.trim() }),
      })
      if (res.ok) {
        const member = await res.json()
        setMembers(prev => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)))
        setNewName(''); setNewContact(''); setShowAdd(false)
      }
    } finally { setAdding(false) }
  }

  async function saveEdit() {
    if (!editMember || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${editMember.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), contact_number: editContact.trim() }),
      })
      if (res.ok) {
        setMembers(prev => prev.map(m => m.id === editMember.id
          ? { ...m, name: editName.trim(), contact_number: editContact.trim() } : m))
        setEditMember(null)
      }
    } finally { setSaving(false) }
  }

  async function deleteMember(id: string) {
    if (!confirm('Remove this member?')) return
    await fetch(`/api/members/${id}`, { method: 'DELETE' }).catch(() => {})
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.contact_number || '').includes(search)
  )

  const p4 = members.filter(m => m.june4_status === 'riding').length
  const p7 = members.filter(m => m.june7_status === 'riding').length
  const a4 = members.filter(m => m.june4_status === 'not_going').length
  const a7 = members.filter(m => m.june7_status === 'not_going').length

  return (
    <main className="min-h-screen bg-[#050a14] bg-grid flex flex-col">

      {/* ── Header ── */}
      <div className={`relative overflow-hidden scanline bg-gradient-to-b ${T.gradient} px-4 pt-10 pb-5 flex-shrink-0`}
        style={{ borderBottom: `1px solid ${T.neonBorder}` }}>

        {/* Corner accents */}
        <span className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: T.neon, opacity: 0.5 }} />
        <span className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: T.neon, opacity: 0.5 }} />

        <div className="max-w-lg mx-auto">
          <Link href="/" className="font-mono-data text-xs tracking-widest text-slate-500 hover:text-slate-300 transition-colors inline-block mb-3">
            ‹ UNITS
          </Link>

          <div className="flex items-end justify-between">
            <div>
              <h1 className={`text-4xl font-black tracking-tight ${T.neonText}`}
                style={{ textShadow: `0 0 20px ${T.neon}60` }}>
                {unit}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono-data font-black text-lg px-2.5 py-0.5 rounded-lg border"
                  style={{ color: T.neon, borderColor: T.neonBorder, background: T.neonBg, textShadow: `0 0 12px ${T.neon}80` }}>
                  {UNIT_BUS[unit]}
                </span>
                <p className="font-mono-data text-xs text-slate-600 tracking-[0.2em]">ATTENDANCE</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono-data text-3xl font-black text-white">{members.length}</p>
              <p className="font-mono-data text-[10px] text-slate-600 tracking-widest">MEMBERS</p>
            </div>
          </div>

          {/* Stats bar */}
          {members.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: 'JUN 04 — GOING', p: p4, a: a4, total: members.length },
                { label: 'JUN 07 — HOME',  p: p7, a: a7, total: members.length },
              ].map(({ label, p, a, total }) => (
                <div key={label} className="glass-dark rounded-xl p-3"
                  style={{ border: `1px solid ${T.neonBorder}` }}>
                  <p className="font-mono-data text-[9px] tracking-widest text-slate-500 mb-1">{label}</p>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-slate-800 mb-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${total > 0 ? (p/total)*100 : 0}%`, background: T.neon, boxShadow: `0 0 8px ${T.neon}` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data text-lg font-black" style={{ color: T.neon }}>{p}</span>
                    <span className="font-mono-data text-xs text-slate-500">present</span>
                    {a > 0 && <span className="font-mono-data text-xs text-rose-500 ml-auto">{a} absent</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="max-w-lg mx-auto w-full px-4 py-3 flex gap-2 flex-shrink-0">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm select-none">⌕</span>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className={`w-full pl-8 pr-3 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 ${T.focusRing} font-mono-data`}
          />
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-slate-800 flex-shrink-0">
          <ModeBtn active={mode === 'rollcall'} onClick={() => setMode('rollcall')} neon={T.neon} title="Roll Call">
            📋 Roll Call
          </ModeBtn>
          <ModeBtn active={mode === 'list'} onClick={() => setMode('list')} neon={T.neon} title="List">
            ☰ List
          </ModeBtn>
        </div>

        {/* Add */}
        <button onClick={() => setShowAdd(true)}
          className={`${T.btnBg} text-white px-3 py-2 rounded-xl font-bold text-sm press transition-colors flex-shrink-0`}>
          +
        </button>
      </div>

      {/* ── Mode label ── */}
      <div className="max-w-lg mx-auto w-full px-4 mb-2 flex-shrink-0 flex items-center justify-between">
        <p className="font-mono-data text-xs font-bold tracking-widest"
          style={{ color: T.neon, textShadow: `0 0 10px ${T.neon}60` }}>
          {mode === 'rollcall' ? '📋 ROLL CALL MODE' : '☰ LIST MODE'}
        </p>
        <p className="font-mono-data text-[10px] text-slate-600 tracking-wider">
          {filtered.length} RECORDS
        </p>
      </div>

      {/* ── Content ── */}
      <div className="max-w-lg mx-auto w-full px-4 pb-8 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            <p className="text-4xl opacity-20 mb-3">◈</p>
            <p className="font-mono-data text-sm tracking-widest">
              {members.length === 0 ? 'NO RECORDS FOUND' : 'NO MATCH'}
            </p>
          </div>
        ) : mode === 'rollcall' ? (
          <div className="space-y-2.5">
            {filtered.map((m, i) => (
              <RollCallCard key={m.id} member={m} index={i + 1} updatingId={updatingId} synced={synced}
                neon={T.neon} neonBg={T.neonBg} neonBorder={T.neonBorder} neonText={T.neonText}
                onToggle={toggleStatus} onDelete={deleteMember}
                onEdit={m => { setEditMember(m); setEditName(m.name); setEditContact(m.contact_number ?? '') }}
              />
            ))}
          </div>
        ) : (
          <ListModeTable members={filtered} updatingId={updatingId} synced={synced}
            neon={T.neon} neonBg={T.neonBg} neonBorder={T.neonBorder} neonText={T.neonText}
            onToggle={toggleStatus} onDelete={deleteMember}
            onEdit={m => { setEditMember(m); setEditName(m.name); setEditContact(m.contact_number ?? '') }}
          />
        )}
      </div>

      {/* ── Add Sheet ── */}
      {showAdd && (
        <CyberSheet title="ADD MEMBER" onClose={() => { setShowAdd(false); setNewName(''); setNewContact('') }} neon={T.neon}>
          <CyberField label="FULL NAME *">
            <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Juan dela Cruz"
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${T.focusRing} font-mono-data text-sm`}
            />
          </CyberField>
          <CyberField label="CONTACT NUMBER">
            <input type="tel" value={newContact} onChange={e => setNewContact(e.target.value)}
              placeholder="09xxxxxxxxx"
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-1 ${T.focusRing} font-mono-data text-sm`}
            />
          </CyberField>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setShowAdd(false); setNewName(''); setNewContact('') }}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-500 font-mono-data text-sm tracking-widest hover:border-slate-500 transition-colors">
              CANCEL
            </button>
            <button onClick={addMember} disabled={adding || !newName.trim()}
              className={`flex-1 py-3 rounded-xl text-white font-mono-data text-sm tracking-widest ${T.btnBg} disabled:opacity-30 transition-colors press`}
              style={{ boxShadow: `0 0 16px ${T.neon}30` }}>
              {adding ? 'ADDING…' : 'ADD'}
            </button>
          </div>
        </CyberSheet>
      )}

      {/* ── Edit Sheet ── */}
      {editMember && (
        <CyberSheet title="EDIT MEMBER" onClose={() => setEditMember(null)} neon={T.neon}>
          <CyberField label="FULL NAME *">
            <input autoFocus type="text" value={editName} onChange={e => setEditName(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 ${T.focusRing} font-mono-data text-sm`}
            />
          </CyberField>
          <CyberField label="CONTACT NUMBER">
            <input type="tel" value={editContact} onChange={e => setEditContact(e.target.value)}
              className={`w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-1 ${T.focusRing} font-mono-data text-sm`}
            />
          </CyberField>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setEditMember(null)}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-500 font-mono-data text-sm tracking-widest hover:border-slate-500 transition-colors">
              CANCEL
            </button>
            <button onClick={saveEdit} disabled={saving || !editName.trim()}
              className={`flex-1 py-3 rounded-xl text-white font-mono-data text-sm tracking-widest ${T.btnBg} disabled:opacity-30 transition-colors press`}
              style={{ boxShadow: `0 0 16px ${T.neon}30` }}>
              {saving ? 'SAVING…' : 'SAVE'}
            </button>
          </div>
        </CyberSheet>
      )}
    </main>
  )
}

/* ─── Mode Button ──────────────────────────────────────────────────────── */
function ModeBtn({ active, onClick, neon, title, children }: {
  active: boolean; onClick: () => void; neon: string; title: string; children: React.ReactNode
}) {
  return (
    <button onClick={onClick} title={title}
      className="px-3 py-2 text-sm font-mono-data font-bold tracking-wide transition-all duration-150 whitespace-nowrap"
      style={{
        background: active ? `${neon}22` : 'transparent',
        color: active ? neon : '#475569',
        boxShadow: active ? `inset 0 0 14px ${neon}25` : 'none',
        textShadow: active ? `0 0 10px ${neon}80` : 'none',
      }}>
      {children}
    </button>
  )
}

/* ─── Roll Call Card ───────────────────────────────────────────────────── */
function RollCallCard({ member, index, updatingId, synced, neon, neonBg, neonBorder, neonText, onToggle, onDelete, onEdit }: {
  member: Member; index: number; updatingId: string | null; synced: boolean
  neon: string; neonBg: string; neonBorder: string; neonText: string
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
  onDelete: (id: string) => void
  onEdit: (m: Member) => void
}) {
  return (
    <div className="rounded-2xl overflow-hidden press"
      style={{ background: neonBg, border: `1px solid ${neonBorder}`, boxShadow: `0 0 12px ${neonBg}` }}>
      <div className="px-4 pt-3 pb-2">
        {/* Index + Name + actions */}
        <div className="flex items-start gap-3 mb-2">
          <span className="font-mono-data text-xs mt-1 flex-shrink-0"
            style={{ color: neon, opacity: 0.5 }}>
            #{String(index).padStart(2, '0')}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-white truncate leading-snug">{member.name}</p>
              {member.bus && (
                <span className="font-mono-data text-[9px] px-1.5 py-0.5 rounded-md border flex-shrink-0"
                  style={{ color: member.bus === 'Bus 1' ? '#3b9eff' : '#ff9933', borderColor: member.bus === 'Bus 1' ? 'rgba(59,158,255,0.4)' : 'rgba(255,153,51,0.4)', background: member.bus === 'Bus 1' ? 'rgba(59,158,255,0.1)' : 'rgba(255,153,51,0.1)' }}>
                  🚌 {member.bus}
                </span>
              )}
            </div>
            {member.contact_number ? (
              <a href={`tel:${member.contact_number}`}
                className="inline-flex items-center gap-1.5 mt-1 text-xs font-mono-data text-slate-400 hover:text-white transition-colors group">
                <span className="group-hover:text-emerald-400 transition-colors">📞</span>
                {member.contact_number}
              </a>
            ) : (
              <button onClick={() => onEdit(member)}
                className="mt-1 text-xs font-mono-data text-slate-700 hover:text-slate-500 transition-colors">
                + add contact
              </button>
            )}
          </div>
          <div className="flex gap-0.5 flex-shrink-0">
            <button onClick={() => onEdit(member)}
              className="p-1.5 text-slate-700 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors text-sm">✏️</button>
            <button onClick={() => onDelete(member.id)}
              className="p-1.5 text-slate-700 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors text-lg leading-none">×</button>
          </div>
        </div>

        {/* Attendance buttons */}
        <div className="grid grid-cols-2 gap-2">
          {(['june4_status', 'june7_status'] as const).map((trip) => {
            const label = trip === 'june4_status' ? 'JUN 4 · GOING' : 'JUN 7 · HOME'
            const present = member[trip] === 'riding'
            const busy    = updatingId === member.id + trip
            return (
              <button key={trip} onClick={() => onToggle(member.id, trip, member[trip])}
                disabled={busy || !synced}
                className={`py-2.5 rounded-xl border-2 text-center transition-all press ${(busy || !synced) ? 'opacity-40' : ''}`}
                style={present ? {
                  background: `${neon}18`,
                  borderColor: `${neon}80`,
                  boxShadow: `0 0 10px ${neon}20`,
                } : {
                  background: 'rgba(15,23,42,0.6)',
                  borderColor: 'rgba(71,85,105,0.5)',
                }}>
                <div className="text-lg mb-0.5">{present ? '✅' : '⬜'}</div>
                <div className="font-mono-data text-[9px] tracking-widest"
                  style={{ color: present ? neon : '#475569' }}>
                  {label}
                </div>
                <div className="font-mono-data text-[10px] font-bold mt-0.5"
                  style={{ color: present ? neon : '#334155' }}>
                  {present ? 'PRESENT' : 'ABSENT'}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─── List Mode Table ──────────────────────────────────────────────────── */
function ListModeTable({ members, updatingId, synced, neon, neonBg, neonBorder, neonText, onToggle, onDelete, onEdit }: {
  members: Member[]; updatingId: string | null; synced: boolean
  neon: string; neonBg: string; neonBorder: string; neonText: string
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
  onDelete: (id: string) => void
  onEdit: (m: Member) => void
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${neonBorder}` }}>
      {/* Header row */}
      <div className="grid grid-cols-[1.6rem_1fr_1.8rem_2.8rem_2.8rem] gap-x-2 px-3 py-2 items-center"
        style={{ background: `${neonBg}`, borderBottom: `1px solid ${neonBorder}` }}>
        <span className="font-mono-data text-[9px] text-slate-600">#</span>
        <span className="font-mono-data text-[9px] text-slate-600 tracking-wider">NAME</span>
        <span className="font-mono-data text-[9px] text-slate-600 text-center">📞</span>
        <span className="font-mono-data text-[9px] text-slate-600 text-center tracking-tight">J4</span>
        <span className="font-mono-data text-[9px] text-slate-600 text-center tracking-tight">J7</span>
      </div>

      {/* Rows */}
      <div>
        {members.map((m, i) => {
          const p4 = m.june4_status === 'riding'
          const p7 = m.june7_status === 'riding'
          const busy4 = updatingId === m.id + 'june4_status'
          const busy7 = updatingId === m.id + 'june7_status'
          return (
            <div key={m.id}
              className="grid grid-cols-[1.6rem_1fr_1.8rem_2.8rem_2.8rem] gap-x-2 px-3 py-2 items-center border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/30 transition-colors"
              style={i % 2 === 0 ? { background: 'rgba(255,255,255,0.01)' } : {}}>

              {/* Index */}
              <span className="font-mono-data text-[10px] text-slate-700">
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Name (tap to edit) */}
              <button onClick={() => onEdit(m)} className="text-left min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs text-slate-200 truncate font-medium leading-tight">{m.name}</p>
                  {m.bus && (
                    <span className="font-mono-data text-[8px] px-1 py-0.5 rounded border flex-shrink-0 leading-none"
                      style={{ color: m.bus === 'Bus 1' ? '#3b9eff' : '#ff9933', borderColor: m.bus === 'Bus 1' ? 'rgba(59,158,255,0.4)' : 'rgba(255,153,51,0.4)', background: m.bus === 'Bus 1' ? 'rgba(59,158,255,0.1)' : 'rgba(255,153,51,0.1)' }}>
                      {m.bus}
                    </span>
                  )}
                </div>
                {m.contact_number && (
                  <p className="font-mono-data text-[9px] text-slate-600 truncate leading-tight">{m.contact_number}</p>
                )}
              </button>

              {/* Call */}
              <div className="flex items-center justify-center">
                {m.contact_number ? (
                  <a href={`tel:${m.contact_number}`}
                    className="text-slate-600 hover:text-emerald-400 transition-colors text-sm">📞</a>
                ) : (
                  <span className="text-slate-800 text-xs">—</span>
                )}
              </div>

              {/* Jun 4 toggle */}
              <button onClick={() => onToggle(m.id, 'june4_status', m.june4_status)}
                disabled={busy4 || !synced}
                className="flex items-center justify-center h-7 rounded-lg text-sm transition-all press"
                style={p4 ? { background: `${neon}20`, border: `1px solid ${neon}50` }
                          : { background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.3)' }}>
                <span style={{ filter: p4 ? `drop-shadow(0 0 4px ${neon})` : 'none', opacity: busy4 ? 0.4 : 1 }}>
                  {p4 ? '✅' : '⬜'}
                </span>
              </button>

              {/* Jun 7 toggle */}
              <button onClick={() => onToggle(m.id, 'june7_status', m.june7_status)}
                disabled={busy7 || !synced}
                className="flex items-center justify-center h-7 rounded-lg text-sm transition-all press"
                style={p7 ? { background: `${neon}20`, border: `1px solid ${neon}50` }
                          : { background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(71,85,105,0.3)' }}>
                <span style={{ filter: p7 ? `drop-shadow(0 0 4px ${neon})` : 'none', opacity: busy7 ? 0.4 : 1 }}>
                  {p7 ? '✅' : '⬜'}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Shared UI ────────────────────────────────────────────────────────── */
function CyberSheet({ title, onClose, neon, children }: {
  title: string; onClose: () => void; neon: string; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
        style={{ background: '#0a1628', border: `1px solid ${neon}30`, borderBottom: 'none',
          boxShadow: `0 -20px 60px ${neon}15` }}>
        {/* Handle */}
        <div className="w-10 h-0.5 rounded-full mx-auto mb-6" style={{ background: neon, opacity: 0.4 }} />
        <p className="font-mono-data text-sm tracking-[0.25em] mb-5" style={{ color: neon }}>{title}</p>
        {children}
      </div>
    </div>
  )
}

function CyberField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="font-mono-data text-[10px] tracking-widest text-slate-600 block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
