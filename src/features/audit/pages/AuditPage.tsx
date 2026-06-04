import { useState, useMemo, useCallback } from 'react'
import { Eye, Shield } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { RoleGuard } from '@/app/router/RoleGuard'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { useAuditLog, useAuditUsers } from '../hooks/useAuditLog'
import { AuditDetailDialog } from '../components/AuditDetailDialog'
import type { AuditLog, AuditFiltres } from '../types'

const TABLES_DISPONIBLES = [
  { value: 'engagements_depenses',  label: 'Engagements' },
  { value: 'liquidations',          label: 'Liquidations' },
  { value: 'mandats_paiement',      label: 'Mandats de paiement' },
  { value: 'recettes',              label: 'Recettes' },
  { value: 'lignes_budgetaires',    label: 'Lignes budgétaires' },
  { value: 'user_profiles',         label: 'Utilisateurs' },
  { value: 'exercices_budgetaires', label: 'Exercices budgétaires' },
]

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  INSERT: { label: 'Création',     className: 'bg-green-100 text-green-700' },
  UPDATE: { label: 'Modification', className: 'bg-amber-100 text-amber-700' },
  DELETE: { label: 'Suppression',  className: 'bg-red-100 text-red-700' },
}

const PAGE_SIZE = 25

export function AuditPage() {
  const [recherche,  setRecherche]  = useState('')
  const [tableName,  setTableName]  = useState('')
  const [userId,     setUserId]     = useState('')
  const [dateDebut,  setDateDebut]  = useState('')
  const [dateFin,    setDateFin]    = useState('')
  const [page,       setPage]       = useState(1)
  const [selected,   setSelected]   = useState<AuditLog | null>(null)

  const filtres = useMemo<AuditFiltres>(() => ({
    search:    recherche  || undefined,
    tableName: tableName  || undefined,
    userId:    userId     || undefined,
    dateDebut: dateDebut  || undefined,
    dateFin:   dateFin    || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [recherche, tableName, userId, dateDebut, dateFin, page])

  const { data, isLoading }     = useAuditLog(filtres)
  const { data: auditUsers = [] } = useAuditUsers()

  const logs  = data?.data  ?? []
  const total = data?.count ?? 0

  const resetPage = useCallback(() => setPage(1), [])

  const colonnes: ColonneDef<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Horodatage',
      render: (log) => (
        <span className="text-xs tabular-nums text-slate-600 whitespace-nowrap">
          {log.createdAt
            ? new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(log.createdAt))
            : '—'}
        </span>
      ),
    },
    {
      key: 'userEmail',
      header: 'Utilisateur',
      render: (log) => (
        <span className="text-sm text-slate-700">
          {log.userEmail ?? <em className="text-slate-400">Système</em>}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => {
        const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, className: 'bg-slate-100 text-slate-600' }
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
      header: 'Enregistrement',
      render: (log) => {
        if (!log.recordId) return <span className="text-slate-400">—</span>
        const court = log.recordId.replace(/-/g, '').slice(0, 8).toUpperCase()
        return (
          <span className="font-mono text-xs text-indigo-600 font-medium">{court}</span>
        )
      },
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
      <div>
        <PageHeader
          titre="Journal d'audit"
          description="Traçabilité complète des opérations — lecture seule immuable"
        />

        {/* Filtres */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <input
              value={recherche}
              onChange={(e) => { setRecherche(e.target.value); resetPage() }}
              placeholder="Rechercher action, email, ID…"
              className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <select
              aria-label="Filtrer par table"
              value={tableName}
              onChange={(e) => { setTableName(e.target.value); resetPage() }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Toutes les tables</option>
              {TABLES_DISPONIBLES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {auditUsers.length > 0 && (
              <select
                aria-label="Filtrer par utilisateur"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); resetPage() }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Tous les utilisateurs</option>
                {auditUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-xs text-slate-500 font-medium">Période :</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => { setDateDebut(e.target.value); resetPage() }}
              aria-label="Date de début"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-slate-400 text-sm">→</span>
            <input
              type="date"
              value={dateFin}
              min={dateDebut || undefined}
              onChange={(e) => { setDateFin(e.target.value); resetPage() }}
              aria-label="Date de fin"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {(dateDebut || dateFin || tableName || userId || recherche) && (
              <button
                type="button"
                onClick={() => {
                  setRecherche(''); setTableName(''); setUserId('')
                  setDateDebut(''); setDateFin(''); resetPage()
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Effacer filtres
              </button>
            )}
          </div>
        </div>

        <DataTable
          colonnes={colonnes}
          donnees={logs}
          isLoading={isLoading}
          totalItems={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          getRowKey={(log) => log.id}
        />

        <p className="mt-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <Shield size={11} />
          Journal immuable — aucune modification ou suppression possible
        </p>

        {selected && (
          <AuditDetailDialog log={selected} onClose={() => setSelected(null)} />
        )}
      </div>
    </RoleGuard>
  )
}
