'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Already installed as PWA — hide prompt
    if (isInStandaloneMode()) return

    // Already dismissed today
    const dismissed = localStorage.getItem('pwa-dismissed')
    if (dismissed) {
      const age = Date.now() - Number(dismissed)
      if (age < 24 * 60 * 60 * 1000) return // hide for 24h after dismiss
    }

    const iosDevice = isIOS()
    setIos(iosDevice)

    if (iosDevice) {
      // iOS: no beforeinstallprompt — show manual instructions after delay
      setTimeout(() => setShow(true), 2000)
      return
    }

    // Android/Chrome: listen for native install event
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 2000)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Fallback: show manual banner after 4s even if event never fires
    const fallback = setTimeout(() => setShow(true), 4000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(fallback)
    }
  }, [])

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') { setShow(false); return }
      setDeferredPrompt(null)
    }
    // No native prompt — just dismiss (user will see browser UI)
    setShow(false)
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('pwa-dismissed', String(Date.now()))
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-safe"
      style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="max-w-lg mx-auto rounded-2xl px-4 py-4"
        style={{
          background: 'rgba(10,18,40,0.97)',
          border: '1px solid rgba(0,220,255,0.35)',
          boxShadow: '0 -4px 40px rgba(0,220,255,0.12), 0 0 0 1px rgba(0,0,0,0.5)',
        }}>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ background: 'rgba(0,220,255,0.1)', border: '1px solid rgba(0,220,255,0.3)' }}>
            🚌
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight">Add to Home Screen</p>
            <p className="font-mono-data text-[10px] text-slate-400 mt-0.5">
              CYA CDO Attendance · Quick access
            </p>
          </div>
          <button onClick={handleDismiss}
            className="text-slate-600 hover:text-slate-400 text-xl leading-none px-1 flex-shrink-0">×</button>
        </div>

        {ios ? (
          // iOS instructions
          <div className="rounded-xl px-3 py-2.5 mb-3"
            style={{ background: 'rgba(0,220,255,0.06)', border: '1px solid rgba(0,220,255,0.15)' }}>
            <p className="font-mono-data text-[10px] text-slate-400 leading-relaxed">
              Tap <span className="text-cyan-400 font-bold">Share</span> <span className="text-base">⬆️</span> at the bottom of Safari,
              then tap <span className="text-cyan-400 font-bold">Add to Home Screen</span>
            </p>
          </div>
        ) : (
          // Android: native prompt or manual
          <button onClick={handleInstall}
            className="w-full py-2.5 rounded-xl font-mono-data font-bold text-sm tracking-widest text-black mb-3"
            style={{ background: 'linear-gradient(135deg, #00dcff, #3b9eff)', boxShadow: '0 0 16px rgba(0,220,255,0.35)' }}>
            INSTALL APP
          </button>
        )}

        <button onClick={handleDismiss}
          className="w-full font-mono-data text-[10px] text-slate-600 hover:text-slate-400 transition-colors tracking-widest py-1">
          NOT NOW
        </button>
      </div>
    </div>
  )
}
