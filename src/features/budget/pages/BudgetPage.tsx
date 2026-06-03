import { useState, useMemo } from 'react'
import { Plus, Wallet, TrendingDown, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { canDo } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { useLignesBudgetaires, useExercices } from '../hooks/useBudget'
import { LigneBudgetaireForm } from '../components/LigneBudgetaireForm'
import type { LigneBudgetaire, TypeCredit } from '../types'
import { cn } from '@/shared/lib/utils'

const TYPE_BADGE: Record<TypeCredit, string> = {
  FONCTIONNEMENT: 'bg-blue-100 text-blue-700',
  INVESTISSEMENT: 'bg-purple-100 text-purple-700',
  TRANSFERT:      'bg-teal-100 text-teal-700',
}

function JaugeProgress({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = clamped >= 90 ? 'bg-red-500' : clamped >= 70 ? 'bg-amber-400' : 'bg-indigo-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs text-slate-500 w-9 text-right">{clamped.toFixed(0)}%</span>
    </div>
  )
}

export function BudgetPage() {
  const { exerciceActif } = useTenant()
  const { profil } = useAuth()
  const { data: exercices } = useExercices()
  const [exerciceId, setExerciceId] = useState<string>('')
  const [recherche, setRecherche] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [showForm, setShowForm] = useState(false)

  const idActif = exerciceId || exerciceActif?.id || ''
  const { data: lignes = [], isLoading } = useLignesBudgetaires(idActif)

  const canCreate = canDo(PERMISSIONS.BUDGET_MODIFY, profil?.roles ?? [])

  const lignesFiltrees = useMemo(() => {
    return lignes.filter((l) => {
      const matchRecherche = !recherche || l.libelle.toLowerCase().includes(recherche.toLowerCase()) || l.codeArticle.includes(recherche)
      const matchType = !typeFilter || l.typeCredit === typeFilter
      return matchRecherche && matchType
    })
  }, [lignes, recherche, typeFilter])

  const stats = useMemo(() => ({
    totalCredits:    lignes.reduce((s, l) => s + l.creditRevise, 0),
    totalEngage:     lignes.reduce((s, l) => s + l.montantEngage, 0),
    totalDisponible: lignes.reduce((s, l) => s + l.creditDisponible, 0),
  }), [lignes])

  const exerciceLabel = exerciceActif ? `Exercice ${exerciceActif.annee}` : '—'

  const colonnes: ColonneDef<LigneBudgetaire>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (l) => (
        <span className="font-mono text-xs text-indigo-600">
          {l.codeTitre}.{l.codeChapitre}.{l.codeArticle}
          {l.codeParagraphe ? `.${l.codeParagraphe}` : ''}
        </span>
      ),
    },
    {
      key: 'libelle',
      header: 'Libellé',
      render: (l) => <span className="text-slate-900 text-sm">{l.libelle}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (l) => (
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_BADGE[l.typeCredit])}>
          {l.typeCredit.charAt(0) + l.typeCredit.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      key: 'creditInitial',
      header: 'Crédit initial',
      render: (l) => <MontantGNF montant={l.creditInitial} taille="sm" couleur="muted" />,
      className: 'text-right',
    },
    {
      key: 'engage',
      header: 'Engagé',
      render: (l) => <MontantGNF montant={l.montantEngage} taille="sm" couleur="default" />,
      className: 'text-right',
    },
    {
      key: 'disponible',
      header: 'Disponible',
      render: (l) => (
        <MontantGNF
          montant={l.creditDisponible}
          taille="sm"
          couleur={l.creditDisponible < 0 ? 'danger' : 'success'}
        />
      ),
      className: 'text-right',
    },
    {
      key: 'jauge',
      header: 'Consommation',
      render: (l) => <JaugeProgress pct={l.tauxConsommation} />,
      className: 'min-w-[140px]',
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Budget"
        description={exerciceLabel}
        actions={
          canCreate ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Nouvelle ligne
            </button>
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <CarteKPI titre="Budget total"   valeur={stats.totalCredits}    couleur="slate"  icone={<Wallet size={18} />} />
        <CarteKPI titre="Engagé"         valeur={stats.totalEngage}     couleur="amber"  icone={<TrendingDown size={18} />} />
        <CarteKPI titre="Disponible"     valeur={stats.totalDisponible} couleur="indigo" icone={<CheckCircle size={18} />} />
      </div>

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          {/* Sélecteur exercice */}
          <select
            aria-label="Sélectionner l'exercice budgétaire"
            value={exerciceId}
            onChange={(e) => setExerciceId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Exercice actif ({exerciceActif?.annee ?? '—'})</option>
            {(exercices ?? []).map((e) => (
              <option key={e.id} value={e.id}>{e.annee} — {e.statut}</option>
            ))}
          </select>

          {/* Recherche */}
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par libellé ou code…"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Filtre type */}
          <select
            aria-label="Filtrer par type de crédit"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            <option value="FONCTIONNEMENT">Fonctionnement</option>
            <option value="INVESTISSEMENT">Investissement</option>
            <option value="TRANSFERT">Transfert</option>
          </select>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={lignesFiltrees}
        isLoading={isLoading}
        getRowKey={(l) => l.id}
      />

      {/* Modal formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Nouvelle ligne budgétaire</h2>
            <LigneBudgetaireForm
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
