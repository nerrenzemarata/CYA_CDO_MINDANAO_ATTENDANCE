'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Don't show if already installed (running as standalone PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if user already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setTimeout(() => setShow(true), 1500) // slight delay before showing
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShow(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-dismissed', '1')
  }

  if (!show || dismissed) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2"
      style={{ background: 'linear-gradient(to top, rgba(5,10,20,0.98), transparent)' }}
    >
      <div
        className="max-w-lg mx-auto rounded-2xl px-4 py-4 flex items-center gap-4"
        style={{
          background: 'rgba(15,23,42,0.95)',
          border: '1px solid rgba(0,220,255,0.3)',
          boxShadow: '0 0 30px rgba(0,220,255,0.1)',
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
          style={{ background: 'rgba(0,220,255,0.1)', border: '1px solid rgba(0,220,255,0.3)' }}
        >
          🚌
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">Add to Home Screen</p>
          <p className="font-mono-data text-[10px] text-slate-400 mt-0.5 tracking-wide">
            Install CYA CDO Attendance for quick access
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono-data tracking-wide text-black"
            style={{ background: 'linear-gradient(135deg, #00dcff, #3b9eff)', boxShadow: '0 0 12px rgba(0,220,255,0.4)' }}
          >
            INSTALL
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-xs font-mono-data text-slate-500 hover:text-slate-300 transition-colors text-center"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
