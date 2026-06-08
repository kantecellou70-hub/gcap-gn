import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckCircle, Clock, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ServerPaginationControls } from '@/shared/components/ServerPaginationControls'
import { useAuth } from '@/app/contexts/AuthContext'
import { canDo } from '@/shared/lib/utils'
import { formatDate } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { useLiquidationsPaginated } from '../hooks/useLiquidations'
import type { Liquidation, StatutLiquidation } from '../types'

export function LiquidationsPage() {
  const navigate = useNavigate()
  const { profil } = useAuth()
  const [statutFiltre, setStatutFiltre] = useState<StatutLiquidation | ''>('')
  const [recherche, setRecherche] = useState('')

  const filtres = useMemo(() => ({
    statut: statutFiltre || undefined,
    search: recherche || undefined,
  }), [statutFiltre, recherche])

  const {
    data: liquidations,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    isFetching,
    goToPage,
  } = useLiquidationsPaginated(filtres)

  const canCreate = canDo(PERMISSIONS.LIQUIDATION_CREATE, profil?.roles ?? [])

  const stats = useMemo(() => ({
    enCours:    liquidations.filter((l) => l.statut === 'SOUMISE').length,
    validees:   liquidations.filter((l) => l.statut === 'VALIDEE').length,
    montantNet: liquidations.filter((l) => l.statut === 'VALIDEE').reduce((s, l) => s + l.montantNet, 0),
  }), [liquidations])

  const colonnes: ColonneDef<Liquidation>[] = [
    {
      key: 'numero',
      header: 'N° Liquidation',
      render: (l) => (
        <span className="font-mono text-xs text-indigo-600 font-medium">{l.numero || '—'}</span>
      ),
    },
    {
      key: 'engagement',
      header: 'Engagement',
      render: (l) => (
        <div>
          <p className="text-xs font-mono text-slate-500">{l.engagement?.numero ?? '—'}</p>
          <p className="text-sm text-slate-800 truncate max-w-xs">{l.engagement?.objet ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'fournisseur',
      header: 'Fournisseur',
      render: (l) => (
        <span className="text-sm text-slate-600">{l.engagement?.fournisseur ?? '—'}</span>
      ),
    },
    {
      key: 'montantNet',
      header: 'Montant net',
      render: (l) => <MontantGNF montant={l.montantNet} taille="sm" />,
      className: 'text-right',
    },
    {
      key: 'dateServiceFait',
      header: 'Date service fait',
      render: (l) => <span className="text-sm text-slate-600">{formatDate(l.dateServiceFait)}</span>,
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (l) => <StatutBadge statut={l.statut} type="liquidation" />,
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Liquidations"
        description={`${totalCount} liquidation${totalCount > 1 ? 's' : ''} — vérification du service fait`}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => navigate('/liquidations/nouveau')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Nouvelle liquidation
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CarteKPI titre="Soumises"    valeur={stats.enCours}    couleur="amber"  icone={Clock}        isLoading={isLoading} />
        <CarteKPI titre="Validées"    valeur={stats.validees}   couleur="green"  icone={CheckCircle}  isLoading={isLoading} />
        <CarteKPI titre="Net liquidé" valeur={stats.montantNet} couleur="indigo" icone={XCircle}      isLoading={isLoading} />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par numéro…"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            aria-label="Filtrer par statut"
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value as StatutLiquidation | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="SOUMISE">Soumise</option>
            <option value="VALIDEE">Validée</option>
            <option value="REJETEE">Rejetée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={liquidations}
        isLoading={isLoading}
        getRowKey={(l) => l.id}
        onRowClick={(l) => navigate(`/liquidations/${l.id}`)}
      />

      <ServerPaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        isFetching={isFetching}
        onPageChange={goToPage}
        className="mt-0 rounded-b-lg px-4"
      />
    </div>
  )
}
