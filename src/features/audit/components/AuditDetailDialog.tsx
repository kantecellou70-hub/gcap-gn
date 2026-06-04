import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { AuditLog } from '../types'

interface Props {
  log: AuditLog
  onClose: () => void
}

function JsonBlock({ titre, data }: { titre: string; data: Record<string, unknown> | null }) {
  if (!data) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{titre}</p>
      <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 overflow-auto max-h-56 whitespace-pre-wrap break-all">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function AuditDetailDialog({ log, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const idCourt = log.recordId
    ? log.recordId.replace(/-/g, '').slice(0, 8).toUpperCase()
    : '—'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Détails de l'événement</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{log.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Méta */}
        <div className="px-5 py-4 space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Horodatage</dt>
              <dd className="font-medium text-slate-800 tabular-nums">
                {log.createdAt ? new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(log.createdAt)) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Utilisateur</dt>
              <dd className="font-medium text-slate-800">{log.userEmail ?? <em className="text-slate-400 not-italic">Système</em>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Action</dt>
              <dd className="font-medium text-slate-800">{log.action}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Table</dt>
              <dd className="font-mono text-xs text-slate-700">{log.tableName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">ID enregistrement</dt>
              <dd className="font-mono text-xs text-indigo-600">{idCourt}</dd>
            </div>
          </dl>

          {log.oldValues && <JsonBlock titre="Anciennes valeurs" data={log.oldValues} />}
          {log.newValues && <JsonBlock titre="Nouvelles valeurs" data={log.newValues} />}
          {!log.oldValues && !log.newValues && (
            <p className="text-xs text-slate-400 text-center py-4">Aucune donnée de diff disponible.</p>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
