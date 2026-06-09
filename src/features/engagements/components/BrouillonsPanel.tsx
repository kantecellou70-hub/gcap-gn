import { useState, useEffect } from 'react'
import { Clock, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { OfflineBadge } from '@/shared/components/OfflineBadge'
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus'
import { getBrouillons, deleteBrouillon, type BrouillonEngagement } from '@/shared/lib/indexedDb'
import { useTenant } from '@/app/contexts/TenantContext'
import { formatGNF } from '@/shared/lib/currency'

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-GN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

interface BrouillonsPanelProps {
  onRefresh?: () => void
}

export function BrouillonsPanel({ onRefresh }: BrouillonsPanelProps) {
  const { tenantId } = useTenant()
  const { isOnline, triggerSync, isSyncing } = useNetworkStatus()
  const [brouillons, setBrouillons] = useState<BrouillonEngagement[]>([])

  async function loadBrouillons() {
    if (!tenantId) return
    const data = await getBrouillons(tenantId)
    setBrouillons(data.sort((a, b) => b.created_at.localeCompare(a.created_at)))
  }

  useEffect(() => {
    void loadBrouillons()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId])

  async function handleDelete(id: string) {
    await deleteBrouillon(id)
    await loadBrouillons()
    onRefresh?.()
  }

  async function handleSync() {
    await triggerSync()
    await loadBrouillons()
    onRefresh?.()
  }

  if (brouillons.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200">
        <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
          <Clock size={15} />
          Brouillons en attente ({brouillons.length})
        </h3>
        {isOnline && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => void handleSync()}
            className="flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            Synchroniser tout
          </button>
        )}
      </div>

      <div className="divide-y divide-amber-100">
        {brouillons.map((b) => (
          <div key={b.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-amber-700">
                    Créé le {formatDateTime(b.created_at)}
                  </span>
                  <OfflineBadge />
                </div>
                <p className="text-sm font-medium text-slate-800 truncate">{b.objet}</p>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-600">
                  {b.fournisseur_nom && (
                    <span>Fournisseur : {b.fournisseur_nom}</span>
                  )}
                  <span className="font-semibold">{formatGNF(b.montant_engage)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isOnline && (
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => void handleSync()}
                    className="rounded p-1.5 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 disabled:opacity-50"
                    title="Synchroniser maintenant"
                  >
                    <RefreshCw size={12} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handleDelete(b.id)}
                  className="rounded p-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200"
                  title="Supprimer le brouillon"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Message d'erreur si échec de sync */}
            {(b as BrouillonEngagement & { _syncError?: string })._syncError && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle size={12} />
                <span>
                  Échec de synchronisation :{' '}
                  {(b as BrouillonEngagement & { _syncError?: string })._syncError}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
