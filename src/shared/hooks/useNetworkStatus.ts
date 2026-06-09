import { useState, useEffect, useCallback, useRef } from 'react'
import { syncManager } from '@/shared/lib/syncManager'
import { getSyncQueueStats } from '@/shared/lib/indexedDb'

type ConnectionType = '4g' | '3g' | '2g' | 'slow-2g' | 'unknown'

interface NetworkConnection extends EventTarget {
  effectiveType?: ConnectionType
  addEventListener(type: 'change', listener: EventListenerOrEventListenerObject): void
  removeEventListener(type: 'change', listener: EventListenerOrEventListenerObject): void
}

function getConnectionType(): ConnectionType {
  const nav = navigator as Navigator & { connection?: NetworkConnection }
  return nav.connection?.effectiveType ?? 'unknown'
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [connectionType, setConnectionType] = useState<ConnectionType>(getConnectionType)
  const [syncPending, setSyncPending] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const syncInProgressRef = useRef(false)

  const refreshPendingCount = useCallback(async () => {
    const stats = await getSyncQueueStats()
    setSyncPending(stats.pending + stats.error)
  }, [])

  const triggerSync = useCallback(async () => {
    if (syncInProgressRef.current || !navigator.onLine) return
    syncInProgressRef.current = true
    setIsSyncing(true)
    try {
      await syncManager.syncPendingItems()
      setLastSyncAt(new Date().toISOString())
      await refreshPendingCount()
    } finally {
      syncInProgressRef.current = false
      setIsSyncing(false)
    }
  }, [refreshPendingCount])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      setWasOffline(true)
      // Déclencher la sync au retour de la connexion
      void triggerSync()
      // Réinitialiser wasOffline après 5 secondes
      setTimeout(() => setWasOffline(false), 5000)
    }

    function handleOffline() {
      setIsOnline(false)
      setWasOffline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const nav = navigator as Navigator & { connection?: NetworkConnection }
    function handleConnectionChange() {
      setConnectionType(getConnectionType())
    }
    nav.connection?.addEventListener('change', handleConnectionChange)

    // Rafraîchir le compteur toutes les 30 secondes
    const interval = setInterval(refreshPendingCount, 30_000)
    void refreshPendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      nav.connection?.removeEventListener('change', handleConnectionChange)
      clearInterval(interval)
    }
  }, [triggerSync, refreshPendingCount])

  return {
    isOnline,
    wasOffline,
    connectionType,
    syncPending,
    isSyncing,
    lastSyncAt,
    triggerSync,
  }
}
