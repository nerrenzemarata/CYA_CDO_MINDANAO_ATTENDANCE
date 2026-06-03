'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/types'

const UNIT_COLOR: Record<string, string> = {
  USTP: '#ffe033', XU: '#3b9eff', Staffer: '#bf7fff',
  UC: '#00ff88', 'CYA High': '#ff9933', Butuan: '#ff3366', Valencia: '#00e5cc',
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export default function GroupChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)

  // Persist name + unit in localStorage
  useEffect(() => {
    setName(localStorage.getItem('chat-name') ?? '')
    setUnit(localStorage.getItem('chat-unit') ?? '')
  }, [])

  async function fetchMessages(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/chat')
      const data = await res.json()
      if (Array.isArray(data)) {
        setMessages(data)
        if (!open && data.length > prevCount.current) {
          setUnread(u => u + (data.length - prevCount.current))
        }
        prevCount.current = data.length
      }
    } catch { /* silent */ } finally {
      if (!silent) setLoading(false)
    }
  }

  // Load on open
  useEffect(() => {
    if (open) {
      setUnread(0)
      fetchMessages()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Scroll to bottom when messages load
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function send() {
    if (!text.trim() || !name.trim()) return
    setSending(true)
    localStorage.setItem('chat-name', name.trim())
    localStorage.setItem('chat-unit', unit)
    const optimistic: ChatMessage = {
      id: 'tmp-' + Date.now(),
      sender_name: name.trim(),
      message: text.trim(),
      unit: unit || null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setText('')
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_name: name.trim(), message: optimistic.message, unit: unit || undefined }),
      })
      if (res.ok) {
        const saved = await res.json()
        setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m))
        prevCount.current += 1
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally { setSending(false) }
  }

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl press shadow-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(0,220,255,0.2), rgba(59,158,255,0.2))',
            border: '1px solid rgba(0,220,255,0.4)',
            boxShadow: '0 0 20px rgba(0,220,255,0.2)',
          }}>
          💬
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-mono-data text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </div>

      {/* ── Chat panel ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>

          <div className="flex flex-col max-w-lg w-full mx-auto h-full"
            style={{ maxHeight: '100dvh' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(0,220,255,0.2)', background: 'rgba(5,10,20,0.98)' }}>
              <span className="text-xl">💬</span>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Group Chat</p>
                <p className="font-mono-data text-[9px] text-slate-500 tracking-widest">REFRESH TO SEE NEW MESSAGES</p>
              </div>
              <button onClick={() => fetchMessages()}
                className="font-mono-data text-[10px] text-cyan-500 hover:text-cyan-300 px-2 py-1 rounded-lg border border-cyan-800/40 hover:border-cyan-600 transition-colors mr-1">
                {loading ? '…' : '↻ Refresh'}
              </button>
              <button onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white text-xl leading-none px-1">×</button>
            </div>

            {/* Name / unit picker (shown if name not set) */}
            {!name && (
              <div className="px-4 py-3 flex-shrink-0"
                style={{ background: 'rgba(0,220,255,0.05)', borderBottom: '1px solid rgba(0,220,255,0.15)' }}>
                <p className="font-mono-data text-[10px] text-cyan-500 tracking-widest mb-2">SET YOUR NAME TO CHAT</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Your name"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono-data placeholder-slate-600 focus:outline-none focus:border-cyan-600"
                    value={name} onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && name.trim()) localStorage.setItem('chat-name', name.trim()) }}
                  />
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-sm font-mono-data focus:outline-none focus:border-cyan-600">
                    <option value="">Unit</option>
                    {['USTP','XU','Staffer','UC','CYA High','Butuan','Valencia'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <button onClick={() => { localStorage.setItem('chat-name', name.trim()); localStorage.setItem('chat-unit', unit) }}
                    disabled={!name.trim()}
                    className="px-4 py-2 rounded-xl font-mono-data text-xs font-bold text-black disabled:opacity-30"
                    style={{ background: 'linear-gradient(135deg, #00dcff, #3b9eff)' }}>
                    OK
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
              style={{ background: 'rgba(5,10,20,0.98)' }}>
              {loading && messages.length === 0 ? (
                <div className="text-center py-16 font-mono-data text-[10px] text-slate-600 tracking-widest">LOADING…</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-3xl mb-2 opacity-30">💬</p>
                  <p className="font-mono-data text-[10px] text-slate-600 tracking-widest">NO MESSAGES YET · BE THE FIRST</p>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.sender_name === name
                const unitColor = msg.unit ? (UNIT_COLOR[msg.unit] ?? '#94a3b8') : '#94a3b8'
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      {/* Sender */}
                      <div className={`flex items-center gap-1.5 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="font-mono-data text-[10px] font-bold" style={{ color: unitColor }}>
                          {msg.sender_name}
                        </span>
                        {msg.unit && (
                          <span className="font-mono-data text-[8px] px-1 rounded border"
                            style={{ color: unitColor, borderColor: `${unitColor}40`, background: `${unitColor}10` }}>
                            {msg.unit}
                          </span>
                        )}
                        <span className="font-mono-data text-[9px] text-slate-600">{timeAgo(msg.created_at)}</span>
                      </div>
                      {/* Bubble */}
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                        style={isMe ? {
                          background: 'rgba(0,220,255,0.15)',
                          border: '1px solid rgba(0,220,255,0.3)',
                          color: '#e2e8f0',
                        } : {
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#cbd5e1',
                        }}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(0,220,255,0.15)', background: 'rgba(5,10,20,0.98)' }}>
              {name ? (
                <>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="font-mono-data text-[9px] text-slate-600">Sending as</span>
                    <span className="font-mono-data text-[9px] text-cyan-500">{name}</span>
                    {unit && <span className="font-mono-data text-[9px] text-slate-600">· {unit}</span>}
                    <button onClick={() => { setName(''); localStorage.removeItem('chat-name') }}
                      className="font-mono-data text-[9px] text-slate-700 hover:text-slate-500 ml-1">change</button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message…"
                      value={text}
                      onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                      className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-600 font-mono-data"
                    />
                    <button onClick={send} disabled={sending || !text.trim()}
                      className="px-4 py-2.5 rounded-xl font-mono-data font-bold text-sm text-black disabled:opacity-30 press"
                      style={{ background: 'linear-gradient(135deg, #00dcff, #3b9eff)', boxShadow: '0 0 12px rgba(0,220,255,0.3)' }}>
                      {sending ? '…' : '↑'}
                    </button>
                  </div>
                </>
              ) : (
                <p className="font-mono-data text-[10px] text-slate-600 text-center tracking-widest py-1">SET YOUR NAME ABOVE TO SEND</p>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  )
}
