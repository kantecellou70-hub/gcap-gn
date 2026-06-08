import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Send, CheckCircle, Banknote, AlertTriangle } from 'lucide-react'
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
import { useMandatsPaginated, useLiquidationsValidees } from '../hooks/useOrdonnancement'
import type { MandatPaiement, StatutMandat } from '../types'

export function OrdonnancementPage() {
  const navigate    = useNavigate()
  const { profil }  = useAuth()
  const [statutFiltre, setStatutFiltre] = useState<StatutMandat | ''>('')

  const filtres = useMemo(() => ({ statut: statutFiltre || undefined }), [statutFiltre])

  const {
    data: mandats,
    totalCount,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    isFetching,
    goToPage,
  } = useMandatsPaginated(filtres)

  const { data: liquidations = [], isLoading: loadLiq } = useLiquidationsValidees()

  const canEmit = canDo(PERMISSIONS.MANDAT_EMIT, profil?.roles ?? [])

  const stats = useMemo(() => ({
    emis:         mandats.filter((m) => m.statut === 'EMIS').length,
    transmis:     mandats.filter((m) => m.statut === 'TRANSMIS_TRESOR').length,
    payes:        mandats.filter((m) => m.statut === 'PAYE').length,
    totalMandate: mandats.reduce((s, m) => s + m.montant, 0),
  }), [mandats])

  const colonnes: ColonneDef<MandatPaiement>[] = [
    {
      key: 'numero',
      header: 'N° Mandat',
      render: (m) => <span className="font-mono text-xs text-indigo-600 font-medium">{m.numero || '—'}</span>,
    },
    {
      key: 'engagement',
      header: 'Engagement / Objet',
      render: (m) => (
        <div>
          <p className="font-mono text-xs text-slate-500">{m.liquidation?.engagement?.numero ?? '—'}</p>
          <p className="text-sm text-slate-800 truncate max-w-[200px]">
            {m.liquidation?.engagement?.objet ?? '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'fournisseur',
      header: 'Bénéficiaire',
      render: (m) => <span className="text-sm text-slate-700">{m.beneficiaire}</span>,
    },
    {
      key: 'montant',
      header: 'Montant',
      render: (m) => <MontantGNF montant={m.montant} taille="sm" />,
      className: 'text-right',
    },
    {
      key: 'modePaiement',
      header: 'Mode',
      render: (m) => (
        <span className="text-xs text-slate-500">{m.modePaiement.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (m) => <StatutBadge statut={m.statut} type="mandat" />,
    },
    {
      key: 'dateEmission',
      header: 'Date émission',
      render: (m) => <span className="text-sm text-slate-500">{formatDate(m.dateEmission)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Ordonnancement — Mandats de paiement"
        description={`${totalCount} mandat${totalCount > 1 ? 's' : ''} — émission et suivi`}
        actions={
          canEmit ? (
            <button type="button" onClick={() => navigate('/ordonnancement/nouveau')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus size={16} /> Émettre un mandat
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <CarteKPI titre="Mandats émis"    valeur={stats.emis}         couleur="indigo" icone={Send}        isLoading={isLoading} />
        <CarteKPI titre="Transmis Trésor" valeur={stats.transmis}     couleur="amber"  icone={Send}        isLoading={isLoading} />
        <CarteKPI titre="Payés"           valeur={stats.payes}        couleur="green"  icone={CheckCircle} isLoading={isLoading} />
        <CarteKPI titre="Total mandaté"   valeur={stats.totalMandate} couleur="slate"  icone={Banknote}    isLoading={isLoading} />
      </div>

      {!loadLiq && liquidations.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
          <AlertTriangle size={16} className="shrink-0" />
          {liquidations.length} liquidation{liquidations.length > 1 ? 's' : ''} validée{liquidations.length > 1 ? 's' : ''} en attente d'ordonnancement.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <select
          aria-label="Filtrer par statut"
          value={statutFiltre}
          onChange={(e) => setStatutFiltre(e.target.value as StatutMandat | '')}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tous les statuts</option>
          <option value="EMIS">Émis</option>
          <option value="TRANSMIS_TRESOR">Transmis Trésor</option>
          <option value="PRIS_EN_CHARGE">Pris en charge</option>
          <option value="PAYE">Payé</option>
          <option value="REJETE_TRESOR">Rejeté Trésor</option>
          <option value="ANNULE">Annulé</option>
        </select>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={mandats}
        isLoading={isLoading}
        getRowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/ordonnancement/${m.id}`)}
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
