'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Member, TripStatus } from '@/types'

type Unit = 'USTP' | 'XU' | 'Staffer' | 'UC' | 'Butuan'
const UNITS: Unit[] = ['USTP', 'XU', 'Staffer', 'UC', 'Butuan']

const UNIT_COLOR: Record<string, string> = {
  USTP:    'bg-blue-600',
  XU:      'bg-green-600',
  Staffer: 'bg-purple-600',
  UC:      'bg-orange-500',
  Butuan:  'bg-red-600',
}

const UNIT_RING: Record<string, string> = {
  USTP:    'focus:ring-blue-400',
  XU:      'focus:ring-green-400',
  Staffer: 'focus:ring-purple-400',
  UC:      'focus:ring-orange-400',
  Butuan:  'focus:ring-red-400',
}

export default function UnitPage({ params }: { params: { unit: string } }) {
  const unit = params.unit as Unit
  const [members, setMembers]     = useState<Member[]>([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [newName, setNewName]     = useState('')
  const [newContact, setNewContact] = useState('')
  const [adding, setAdding]       = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editMember, setEditMember] = useState<Member | null>(null)
  const [editName, setEditName]   = useState('')
  const [editContact, setEditContact] = useState('')
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')

  if (!UNITS.includes(unit)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Unit not found.</p>
          <Link href="/" className="text-blue-600 mt-2 inline-block">← Back</Link>
        </div>
      </div>
    )
  }

  const headerColor = UNIT_COLOR[unit] || 'bg-blue-600'
  const ringColor   = UNIT_RING[unit]  || 'focus:ring-blue-400'

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/members?unit=${unit}`)
      const data = await res.json()
      if (Array.isArray(data)) setMembers(data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [unit])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  async function toggleStatus(
    memberId: string,
    trip: 'june4_status' | 'june7_status',
    currentStatus: TripStatus,
  ) {
    const next: TripStatus = currentStatus === 'riding' ? 'not_going' : 'riding'
    setUpdatingId(memberId + trip)
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [trip]: next }),
      })
      if (res.ok) {
        setMembers(prev =>
          prev.map(m => (m.id === memberId ? { ...m, [trip]: next } : m)),
        )
      }
    } finally {
      setUpdatingId(null)
    }
  }

  async function addMember() {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit,
          name: newName.trim(),
          contact_number: newContact.trim(),
        }),
      })
      if (res.ok) {
        const member = await res.json()
        setMembers(prev =>
          [...prev, member].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setNewName('')
        setNewContact('')
        setShowAdd(false)
      }
    } finally {
      setAdding(false)
    }
  }

  async function saveEdit() {
    if (!editMember || !editName.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/members/${editMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          contact_number: editContact.trim(),
        }),
      })
      if (res.ok) {
        setMembers(prev =>
          prev.map(m =>
            m.id === editMember.id
              ? { ...m, name: editName.trim(), contact_number: editContact.trim() }
              : m,
          ),
        )
        setEditMember(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteMember(id: string) {
    if (!confirm('Remove this member?')) return
    try {
      await fetch(`/api/members/${id}`, { method: 'DELETE' })
      setMembers(prev => prev.filter(m => m.id !== id))
    } catch {
      // silently fail
    }
  }

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.contact_number?.includes(search),
  )

  const riding4 = members.filter(m => m.june4_status === 'riding').length
  const riding7 = members.filter(m => m.june7_status === 'riding').length
  const not4    = members.filter(m => m.june4_status === 'not_going').length
  const not7    = members.filter(m => m.june7_status === 'not_going').length

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`${headerColor} text-white px-4 pt-10 pb-5`}>
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-white/70 text-sm flex items-center gap-1 mb-3">
            ‹ All Units
          </Link>
          <h1 className="text-3xl font-bold">{unit}</h1>
          <p className="text-white/70 text-sm">Unit Attendance</p>

          {/* Stats row */}
          {members.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-white/15 rounded-xl p-3">
                <p className="text-xs text-white/70 mb-0.5">June 4 (Going)</p>
                <p className="text-lg font-bold">{riding4} <span className="text-sm font-normal text-white/70">riding</span></p>
                {not4 > 0 && <p className="text-xs text-red-200">{not4} not going</p>}
              </div>
              <div className="bg-white/15 rounded-xl p-3">
                <p className="text-xs text-white/70 mb-0.5">June 7 (Home)</p>
                <p className="text-lg font-bold">{riding7} <span className="text-sm font-normal text-white/70">riding</span></p>
                {not7 > 0 && <p className="text-xs text-red-200">{not7} not going</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Search + Add row */}
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members..."
            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => setShowAdd(true)}
            className={`${headerColor} text-white px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap active:opacity-80`}
          >
            + Add
          </button>
        </div>

        {/* Member List */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            <p>Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">👥</div>
            <p className="font-medium">{members.length === 0 ? 'No members yet' : 'No results'}</p>
            {members.length === 0 && (
              <p className="text-sm mt-1">Tap "+ Add" to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {filtered.map(member => (
              <MemberCard
                key={member.id}
                member={member}
                updatingId={updatingId}
                onToggle={toggleStatus}
                onDelete={deleteMember}
                onEdit={m => {
                  setEditMember(m)
                  setEditName(m.name)
                  setEditContact(m.contact_number ?? '')
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Member Sheet */}
      {showAdd && (
        <BottomSheet title="Add Member" onClose={() => { setShowAdd(false); setNewName(''); setNewContact('') }}>
          <div className="space-y-3">
            <Field label="Full Name *">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Juan dela Cruz"
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${ringColor}`}
              />
            </Field>
            <Field label="Contact Number">
              <input
                type="tel"
                value={newContact}
                onChange={e => setNewContact(e.target.value)}
                placeholder="e.g. 09xxxxxxxxx"
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${ringColor}`}
              />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => { setShowAdd(false); setNewName(''); setNewContact('') }}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={addMember}
              disabled={adding || !newName.trim()}
              className={`flex-1 py-3 rounded-xl text-white font-medium ${headerColor} disabled:opacity-40`}
            >
              {adding ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Edit Member Sheet */}
      {editMember && (
        <BottomSheet title="Edit Member" onClose={() => setEditMember(null)}>
          <div className="space-y-3">
            <Field label="Full Name *">
              <input
                autoFocus
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${ringColor}`}
              />
            </Field>
            <Field label="Contact Number">
              <input
                type="tel"
                value={editContact}
                onChange={e => setEditContact(e.target.value)}
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 ${ringColor}`}
              />
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setEditMember(null)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving || !editName.trim()}
              className={`flex-1 py-3 rounded-xl text-white font-medium ${headerColor} disabled:opacity-40`}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </BottomSheet>
      )}
    </main>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

interface MemberCardProps {
  member: Member
  updatingId: string | null
  onToggle: (id: string, trip: 'june4_status' | 'june7_status', cur: TripStatus) => void
  onDelete: (id: string) => void
  onEdit: (m: Member) => void
}

function MemberCard({ member, updatingId, onToggle, onDelete, onEdit }: MemberCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      {/* Name row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-gray-800 truncate">{member.name}</h3>
          {member.contact_number ? (
            <a
              href={`tel:${member.contact_number}`}
              className="text-sm text-blue-500 hover:underline"
            >
              {member.contact_number}
            </a>
          ) : (
            <span className="text-sm text-gray-300">No contact</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(member)}
            className="text-gray-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(member.id)}
            className="text-gray-300 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 transition-colors text-lg leading-none"
            title="Remove"
          >
            ×
          </button>
        </div>
      </div>

      {/* Trip status buttons */}
      <div className="grid grid-cols-2 gap-2">
        <TripButton
          label="June 4 (Going)"
          status={member.june4_status}
          loading={updatingId === member.id + 'june4_status'}
          onClick={() => onToggle(member.id, 'june4_status', member.june4_status)}
        />
        <TripButton
          label="June 7 (Home)"
          status={member.june7_status}
          loading={updatingId === member.id + 'june7_status'}
          onClick={() => onToggle(member.id, 'june7_status', member.june7_status)}
        />
      </div>
    </div>
  )
}

function TripButton({
  label,
  status,
  loading,
  onClick,
}: {
  label: string
  status: TripStatus
  loading: boolean
  onClick: () => void
}) {
  const riding = status === 'riding'
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`py-2.5 px-3 rounded-xl text-left transition-all active:scale-95 border ${
        riding
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-600'
      } ${loading ? 'opacity-50 cursor-wait' : ''}`}
    >
      <div className="text-[10px] font-medium text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-semibold">{riding ? '🚌 Riding' : '❌ Not Going'}</div>
    </button>
  )
}

function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-500 block mb-1">{label}</label>
      {children}
    </div>
  )
}
