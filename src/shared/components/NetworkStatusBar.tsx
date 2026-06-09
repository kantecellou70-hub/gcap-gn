import { useState, useEffect } from 'react'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'

type BarState = 'hidden' | 'offline' | 'syncing' | 'success' | 'error'

export function NetworkStatusBar() {
  const { isOnline, syncPending, isSyncing, lastSyncAt, triggerSync } = useNetworkStatus()
  const [barState, setBarState] = useState<BarState>('hidden')
  const [successCount, setSuccessCount] = useState(0)
  const prevSyncPendingRef = { current: syncPending }

  useEffect(() => {
    if (!isOnline) {
      setBarState('offline')
      return
    }

    if (isSyncing) {
      setBarState('syncing')
      return
    }

    if (syncPending > 0 && isOnline) {
      setBarState('syncing')
      return
    }

    // On vient de finir une sync réussie
    if (barState === 'syncing' && syncPending === 0 && isOnline) {
      setSuccessCount(prevSyncPendingRef.current)
      setBarState('success')
      const t = setTimeout(() => setBarState('hidden'), 3000)
      return () => clearTimeout(t)
    }

    if (barState !== 'success') {
      setBarState('hidden')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isSyncing, syncPending, lastSyncAt])

  if (barState === 'hidden') return null

  const configs = {
    offline: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      message: 'Hors ligne — vos saisies sont sauvegardées localement',
      icon: '📶',
    },
    syncing: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      message: `Synchronisation en cours${syncPending > 0 ? ` (${syncPending} élément${syncPending > 1 ? 's' : ''})` : ''}…`,
      icon: '🔄',
    },
    success: {
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
      message: `${successCount} engagement${successCount > 1 ? 's' : ''} synchronisé${successCount > 1 ? 's' : ''}`,
      icon: '✅',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      message: 'Éléments non synchronisés — vérifiez votre connexion',
      icon: '⚠️',
    },
  }

  const cfg = configs[barState]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sticky top-0 z-40 flex items-center justify-between px-4 py-2 text-xs font-medium border-b transition-opacity duration-300 ${cfg.bg} ${cfg.text}`}
      style={{ minHeight: 36 }}
    >
      <span>
        {cfg.icon} {cfg.message}
      </span>
      {barState === 'offline' && syncPending > 0 && (
        <button
          type="button"
          onClick={() => void triggerSync()}
          className="underline hover:no-underline ml-4 shrink-0"
        >
          Synchroniser maintenant
        </button>
      )}
    </div>
  )
}
