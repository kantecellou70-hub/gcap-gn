import { useEffect } from 'react'
import { X, MinusCircle } from 'lucide-react'
import type { AuditLog } from '../types'
import { SignatureStatusBadge } from './SignatureStatusBadge'

const FMT = new Intl.DateTimeFormat('fr-GN', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

interface Props {
  entry: AuditLog
  onClose: () => void
}

function JsonBlock({ titre, data }: { titre: string; data: Record<string, unknown> | null }) {
  if (!data) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{titre}</p>
      <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 overflow-auto max-h-48 whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function AuditEntryDrawer({ entry, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const idCourt = entry.recordId
    ? entry.recordId.replace(/-/g, '').slice(0, 8).toUpperCase()
    : '—'

  return (
    <div
      className="absolute inset-0 z-40 flex justify-end"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Détail de l'événement</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[280px]" title={entry.id}>
              {entry.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 shrink-0"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Horodatage</dt>
              <dd className="font-medium text-slate-800 tabular-nums text-xs">
                {entry.createdAt ? FMT.format(new Date(entry.createdAt)) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Utilisateur</dt>
              <dd className="font-medium text-slate-800 text-xs truncate">
                {entry.userEmail ?? entry.userId ?? <em className="text-slate-400 not-italic">Système</em>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Action</dt>
              <dd className="font-mono text-xs text-indigo-700 font-semibold">{entry.action}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Table</dt>
              <dd className="font-mono text-xs text-slate-700">{entry.tableName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ID enregistrement</dt>
              <dd className="font-mono text-xs text-indigo-600 font-medium">{idCourt}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">IP</dt>
              <dd className="font-mono text-xs text-slate-600">{entry.ipAddress ?? '—'}</dd>
            </div>
          </dl>

          <JsonBlock titre="Anciennes valeurs" data={entry.oldValues} />
          <JsonBlock titre="Nouvelles valeurs" data={entry.newValues} />

          {!entry.oldValues && !entry.newValues && (
            <p className="text-xs text-slate-400 text-center py-4">Aucune donnée de diff disponible.</p>
          )}

          {/* Signature */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Intégrité cryptographique
            </p>
            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Statut</span>
                <SignatureStatusBadge entry={entry} />
              </div>
              {entry.signature ? (
                <div>
                  <p className="text-xs text-slate-500 mb-1">HMAC-SHA256</p>
                  <p className="font-mono text-xs text-slate-600 break-all">{entry.signature}</p>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <MinusCircle size={12} />
                  Aucune signature (entrée antérieure à l'axe 4)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// Keep old name for backwards compatibility
export { AuditEntryDrawer as AuditDetailDialog }
