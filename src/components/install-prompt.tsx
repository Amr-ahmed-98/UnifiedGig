'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Download, X, Share } from 'lucide-react'

const DISMISS_KEY = 'ug-install-dismissed-at'
const DISMISS_DAYS = 14

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isDismissedRecently() {
  const raw = localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const elapsedMs = Date.now() - Number(raw)
  return elapsedMs < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS never fires beforeinstallprompt — show manual instructions instead,
    // after a short delay so it doesn't compete with the page's own entrance.
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIOS()) {
      iosTimer = setTimeout(() => {
        setShowIOSBanner(true)
        setVisible(true)
      }, 4000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    setDeferredPrompt(null)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (deferredPrompt || showIOSBanner) && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          role="dialog"
          aria-label="Install UnifiedGig"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-edge/15 bg-panel-2 p-4 shadow-xl sm:inset-x-auto sm:right-4"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#0A0616]"
            style={{ background: '#CCFF00' }}
          >
            {showIOSBanner ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
          </div>

          <div className="flex-1 text-sm">
            <p className="font-medium text-fg">Install UnifiedGig</p>
            {showIOSBanner ? (
              <p className="text-fg/60">
                Tap <Share className="inline h-3.5 w-3.5 -translate-y-px" /> then &quot;Add to Home Screen&quot;
              </p>
            ) : (
              <p className="text-fg/60">Add to your home screen for quick access</p>
            )}
          </div>

          {!showIOSBanner && (
            <button
              data-cursor-hover
              onClick={handleInstall}
              className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[#0A0616]"
              style={{ background: '#CCFF00' }}
            >
              Install
            </button>
          )}

          <button
            data-cursor-hover
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 text-fg/40"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
