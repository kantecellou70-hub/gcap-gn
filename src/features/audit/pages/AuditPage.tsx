import { useState, useCallback, useRef } from 'react'
import { Eye, Shield, Download, FileText, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { RoleGuard } from '@/app/router/RoleGuard'
import { PERMISSIONS } from '@/shared/constants/permissions'
import {
  useAuditLog,
  useAuditUsers,
  useAuditActions,
  useAuditExport,
} from '../hooks/useAuditLog'
import { AuditEntryDrawer } from '../components/AuditEntryDrawer'
import { AuditFiltersBar } from '../components/AuditFiltersBar'
import { SignatureStatusBadge } from '../components/SignatureStatusBadge'
import type { AuditLog, AuditFiltres } from '../types'

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  INSERT: { label: 'Création',     className: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Modification', className: 'bg-amber-100 text-amber-700' },
  DELETE: { label: 'Suppression',  className: 'bg-red-100 text-red-700' },
}

function getActionCfg(action: string) {
  if (ACTION_CONFIG[action]) return ACTION_CONFIG[action]
  if (action.startsWith('engagement')) return { label: action, className: 'bg-blue-100 text-blue-700' }
  if (action.startsWith('mandat'))     return { label: action, className: 'bg-purple-100 text-purple-700' }
  if (action.startsWith('budget'))     return { label: action, className: 'bg-green-100 text-green-700' }
  if (action.startsWith('auth'))       return { label: action, className: 'bg-slate-100 text-slate-600' }
  return { label: action, className: 'bg-slate-100 text-slate-600' }
}

const PAGE_SIZE = 50
const EMPTY_FILTRES: AuditFiltres = { pageSize: PAGE_SIZE }

export function AuditPage() {
  const [filtres,  setFiltres]  = useState<AuditFiltres>(EMPTY_FILTRES)
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isLoading }         = useAuditLog(filtres)
  const { data: auditUsers = [] }   = useAuditUsers()
  const { data: auditActions = [] } = useAuditActions()
  const { exportCsv, exportPdf, isExporting, pdfWarning, clearPdfWarning } = useAuditExport(filtres)

  const logs  = data?.data  ?? []
  const total = data?.count ?? 0

  const handleFiltresChange = useCallback((f: AuditFiltres) => {
    setFiltres({ ...f, pageSize: PAGE_SIZE })
  }, [])

  const resetFiltres = useCallback(() => {
    setFiltres(EMPTY_FILTRES)
  }, [])

  const handlePageChange = useCallback((p: number) => {
    setFiltres((prev) => ({ ...prev, page: p }))
  }, [])

  const colonnes: ColonneDef<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Date/Heure',
      render: (log) => (
        <span className="text-xs tabular-nums text-slate-600 whitespace-nowrap">
          {log.createdAt
            ? new Intl.DateTimeFormat('fr-GN', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              }).format(new Date(log.createdAt))
            : '—'}
        </span>
      ),
    },
    {
      key: 'userEmail',
      header: 'Utilisateur',
      render: (log) => (
        <span className="text-xs text-slate-700 truncate max-w-[140px] block">
          {log.userEmail ?? <em className="text-slate-400">Système</em>}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => {
        const cfg = getActionCfg(log.action)
        return (
          <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
            {cfg.label}
          </span>
        )
      },
    },
    {
      key: 'tableName',
      header: 'Table',
      render: (log) => (
        <span className="font-mono text-xs text-slate-600">{log.tableName}</span>
      ),
    },
    {
      key: 'recordId',
      header: 'Enreg.',
      render: (log) => {
        if (!log.recordId) return <span className="text-slate-400">—</span>
        const court = log.recordId.replace(/-/g, '').slice(0, 8).toUpperCase()
        return <span className="font-mono text-xs text-indigo-600 font-medium">{court}</span>
      },
    },
    {
      key: 'signature',
      header: 'Signature',
      render: (log) => <SignatureStatusBadge entry={log} />,
    },
    {
      key: 'details',
      header: 'Détails',
      render: (log) => (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setSelected(log) }}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 font-medium"
        >
          <Eye size={12} />
          Voir
        </button>
      ),
    },
  ]

  return (
    <RoleGuard
      permission={PERMISSIONS.AUDIT_CONSULTER}
      fallback={
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Shield size={40} className="text-slate-300" />
          <p className="text-sm text-slate-500">Accès réservé aux auditeurs et contrôleurs.</p>
        </div>
      }
    >
      <div className="relative" ref={containerRef}>
        <PageHeader
          titre="Journal d'audit"
          description="Traçabilité complète des opérations — lecture seule immuable"
        />

        <AuditFiltersBar
          filtres={filtres}
          onChange={handleFiltresChange}
          onReset={resetFiltres}
          users={auditUsers}
          actions={auditActions}
        />

        {/* Barre d'actions */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-sm text-slate-500">
            {isLoading ? 'Chargement…' : `${total.toLocaleString('fr')} entrée${total > 1 ? 's' : ''}`}
          </p>

          <div className="flex items-center gap-2">
            {pdfWarning && (
              <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                <AlertTriangle size={12} />
                PDF limité à 500 entrées — réduisez la plage de dates
                <button type="button" onClick={clearPdfWarning} className="ml-1 text-amber-500 hover:text-amber-700">✕</button>
              </span>
            )}
            <button
              type="button"
              data-tour="btn-export-csv"
              onClick={exportCsv}
              disabled={isExporting || total === 0}
              aria-label="Exporter le journal d'audit en CSV"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={13} aria-hidden="true" />
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={isExporting || total === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={13} />
              Exporter PDF
            </button>
          </div>
        </div>

        <DataTable
          colonnes={colonnes}
          donnees={logs}
          isLoading={isLoading}
          totalItems={total}
          page={filtres.page ?? 1}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          getRowKey={(log) => log.id}
        />

        <p className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <Shield size={11} />
          Journal immuable — aucune modification ou suppression possible
        </p>

        {selected && (
          <AuditEntryDrawer entry={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </RoleGuard>
  )
}
