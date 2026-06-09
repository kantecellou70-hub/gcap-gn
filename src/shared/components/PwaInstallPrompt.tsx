import { useState, useEffect, useRef } from 'react'
import { Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosHint, setShowIosHint] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const ua = navigator.userAgent
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const standalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
    if (ios && !standalone) setIsIos(true)

    function handler(e: Event) {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setCanInstall(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!promptRef.current) return
    await promptRef.current.prompt()
    const { outcome } = await promptRef.current.userChoice
    if (outcome === 'accepted') {
      setCanInstall(false)
      promptRef.current = null
    }
  }

  if (isIos) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIosHint((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
          title="Installer l'application"
        >
          <Smartphone size={14} />
          <span className="hidden sm:inline">Installer</span>
        </button>
        {showIosHint && (
          <div className="absolute right-0 top-10 w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg z-50 text-xs text-slate-700">
            Sur iPhone/iPad : touchez le bouton{' '}
            <strong>Partager</strong> puis{' '}
            <strong>"Sur l'écran d'accueil"</strong>
          </div>
        )}
      </>
    )
  }

  if (!canInstall) return null

  return (
    <button
      type="button"
      onClick={() => void handleInstall()}
      className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors"
      title="Installer l'application GCAP-GN"
    >
      <Smartphone size={14} />
      <span className="hidden sm:inline">Installer l'app</span>
    </button>
  )
}
