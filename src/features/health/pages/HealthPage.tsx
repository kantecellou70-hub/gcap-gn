import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Activity } from 'lucide-react'
import { runHealthCheck, type HealthReport, type CheckStatus } from '../api/healthCheck'

const REFRESH_INTERVAL_MS = 30_000

function StatusIcon({ status }: { status: CheckStatus | HealthReport['status'] }) {
  if (status === 'ok')      return <CheckCircle  size={18} className="text-green-500" />
  if (status === 'error')   return <XCircle      size={18} className="text-red-500" />
  return                           <AlertTriangle size={18} className="text-amber-500" />
}

function StatusBadge({ status }: { status: HealthReport['status'] }) {
  const cls = status === 'ok'
    ? 'bg-green-100 text-green-800 border-green-200'
    : status === 'degraded'
    ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-red-100 text-red-800 border-red-200'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}>
      <StatusIcon status={status} />
      {status.toUpperCase()}
    </span>
  )
}

function CheckRow({ label, result }: {
  label: string
  result: { status: CheckStatus; latency_ms?: number; message?: string; migrations_applied?: number }
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <StatusIcon status={result.status} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {result.message && (
          <span className="text-xs text-red-600 bg-red-50 rounded px-2 py-0.5">{result.message}</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        {result.latency_ms !== undefined && (
          <span>{result.latency_ms} ms</span>
        )}
        {result.migrations_applied !== undefined && (
          <span>{result.migrations_applied} migrations</span>
        )}
      </div>
    </div>
  )
}

export function HealthPage() {
  const [report, setReport]     = useState<HealthReport | null>(null)
  const [loading, setLoading]   = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const r = await runHealthCheck()
      setReport(r)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const interval = setInterval(() => void refresh(), REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity size={24} className="text-indigo-600" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">GCAP-GN — Health</h1>
              <p className="text-xs text-slate-500">
                {import.meta.env.VITE_APP_ENV ?? 'unknown'} · v{import.meta.env.VITE_APP_VERSION ?? '1.0.0'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Rafraîchir
          </button>
        </div>

        {/* Statut global */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Statut global</span>
            {report && <StatusBadge status={report.status} />}
            {!report && loading && (
              <span className="text-sm text-slate-400">Vérification…</span>
            )}
          </div>

          {report && (
            <div className="space-y-1">
              <CheckRow label="Supabase (connexion)"  result={report.checks.supabase} />
              <CheckRow label="Auth (service)"        result={report.checks.auth} />
              <CheckRow label="Base de données"       result={report.checks.database} />
              <CheckRow label="Storage (fichiers)"    result={report.checks.storage} />
            </div>
          )}
        </div>

        {/* Métadonnées */}
        {report && (
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Détails</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp</span>
                <span className="text-slate-700 font-mono text-xs">{report.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Version</span>
                <span className="text-slate-700">{report.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Environnement</span>
                <span className="text-slate-700">{report.env}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Uptime</span>
                <span className="text-slate-700 font-mono text-xs">
                  {report.uptime_seconds}s
                </span>
              </div>
              {lastRefresh && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Dernière vérification</span>
                  <span className="text-slate-700 text-xs">
                    {new Intl.DateTimeFormat('fr-GN', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    }).format(lastRefresh)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JSON brut (pour monitoring automatisé) */}
        {report && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
              Afficher JSON brut
            </summary>
            <pre className="mt-2 rounded-lg bg-slate-900 text-green-400 text-xs p-4 overflow-auto">
              {JSON.stringify(report, null, 2)}
            </pre>
          </details>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Rafraîchissement automatique toutes les 30 secondes
        </p>
      </div>
    </div>
  )
}
