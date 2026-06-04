import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, TrendingUp, CheckCircle, Wallet } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import { cn } from '@/shared/lib/utils'
import { formatDate } from '@/shared/lib/utils'
import { useRecettes } from '../hooks/useRecettes'
import {
  STATUT_RECETTE_LABELS, STATUT_RECETTE_COLORS,
  TYPE_RECETTE_LABELS, TYPE_RECETTE_COLORS,
  ROLES_RECETTE_CREATE,
} from '../constants'
import type { Recette, StatutRecette, TypeRecette } from '../types'

export function RecettesPage() {
  const navigate         = useNavigate()
  const { profil }       = useAuth()
  const { exerciceActif } = useTenant()

  const [statutFiltre, setStatutFiltre]   = useState<StatutRecette | ''>('')
  const [typeFiltre, setTypeFiltre]       = useState<TypeRecette | ''>('')
  const [recherche, setRecherche]         = useState('')

  const filtres = useMemo(() => ({
    statut:      statutFiltre || undefined,
    typeRecette: typeFiltre || undefined,
    search:      recherche || undefined,
  }), [statutFiltre, typeFiltre, recherche])

  const { data: recettes = [], isLoading } = useRecettes(filtres)

  const canCreate = profil?.roles.some((r) => ROLES_RECETTE_CREATE.includes(r as string)) ?? false

  const stats = useMemo(() => ({
    totalPrevu:    recettes.reduce((s, r) => s + r.montantPrevu, 0),
    totalConstate: recettes.reduce((s, r) => s + r.montantConstate, 0),
    totalRecouvre: recettes.reduce((s, r) => s + r.montantRecouvre, 0),
    count:         recettes.length,
  }), [recettes])

  const tauxRecouvrement = stats.totalPrevu > 0
    ? Math.round((stats.totalRecouvre / stats.totalPrevu) * 100)
    : 0

  const colonnes: ColonneDef<Recette>[] = [
    {
      key: 'numero',
      header: 'Numéro',
      render: (r) => <span className="font-mono text-xs text-indigo-600">{r.numero || '—'}</span>,
    },
    {
      key: 'libelle',
      header: 'Libellé',
      render: (r) => <span className="text-sm text-slate-800 truncate max-w-[200px] block">{r.libelle}</span>,
    },
    {
      key: 'typeRecette',
      header: 'Type',
      render: (r) => (
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_RECETTE_COLORS[r.typeRecette])}>
          {TYPE_RECETTE_LABELS[r.typeRecette]}
        </span>
      ),
    },
    {
      key: 'montantPrevu',
      header: 'Prévu',
      render: (r) => <MontantGNF montant={r.montantPrevu} taille="sm" couleur="muted" />,
      className: 'text-right',
    },
    {
      key: 'montantConstate',
      header: 'Constaté',
      render: (r) => <MontantGNF montant={r.montantConstate} taille="sm" />,
      className: 'text-right',
    },
    {
      key: 'montantRecouvre',
      header: 'Recouvré',
      render: (r) => <MontantGNF montant={r.montantRecouvre} taille="sm" couleur="success" />,
      className: 'text-right',
    },
    {
      key: 'debiteur',
      header: 'Débiteur',
      render: (r) => <span className="text-sm text-slate-600 truncate max-w-[150px] block">{r.debiteur}</span>,
    },
    {
      key: 'dateConstatation',
      header: 'Date constat.',
      render: (r) => (
        <span className="text-sm text-slate-500">{r.dateConstatation ? formatDate(r.dateConstatation) : '—'}</span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (r) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUT_RECETTE_COLORS[r.statut])}>
          {STATUT_RECETTE_LABELS[r.statut]}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Recettes non fiscales"
        description={`${stats.count} recette${stats.count > 1 ? 's' : ''} · Exercice ${exerciceActif?.annee ?? '—'} · Taux recouvrement : ${tauxRecouvrement}%`}
        actions={
          canCreate ? (
            <button type="button" onClick={() => navigate('/recettes/nouveau')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus size={16} /> Nouvelle recette
            </button>
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <CarteKPI titre="Total prévu"    valeur={stats.totalPrevu}    couleur="slate"  icone={Wallet}      isLoading={isLoading} />
        <CarteKPI titre="Constaté"       valeur={stats.totalConstate} couleur="amber"  icone={TrendingUp}  isLoading={isLoading} />
        <CarteKPI titre="Recouvré"       valeur={stats.totalRecouvre} couleur="green"  icone={CheckCircle} isLoading={isLoading} />
        <CarteKPI titre="Taux recouvr." valeur={`${tauxRecouvrement}%`} couleur="indigo" icone={TrendingUp} isLoading={isLoading} />
      </div>

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par libellé…"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            aria-label="Filtrer par statut"
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value as StatutRecette | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les statuts</option>
            <option value="PREVUE">Prévue</option>
            <option value="CONSTATEE">Constatée</option>
            <option value="RECOUVREE">Recouvrée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
          <select
            aria-label="Filtrer par type"
            value={typeFiltre}
            onChange={(e) => setTypeFiltre(e.target.value as TypeRecette | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            <option value="REDEVANCE">Redevance</option>
            <option value="VENTE_SERVICE">Vente de service</option>
            <option value="REMBOURSEMENT">Remboursement</option>
            <option value="DON">Don / Subvention</option>
            <option value="AUTRE">Autre</option>
          </select>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={recettes}
        isLoading={isLoading}
        getRowKey={(r) => r.id}
        onRowClick={(r) => navigate(`/recettes/${r.id}`)}
      />
    </div>
  )
}
