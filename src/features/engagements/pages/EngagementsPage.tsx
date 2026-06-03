import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { RoleGuard } from '@/app/router/RoleGuard'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import { formatDate } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'
import { useEngagements, useSoumettreEngagement, useAnnulerEngagement } from '../hooks/useEngagements'
import type { Engagement, StatutEngagement } from '../types'
import { cn } from '@/shared/lib/utils'

const STATUTS: { value: StatutEngagement | ''; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_ATTENTE_VISA', label: 'En attente de visa' },
  { value: 'VISE', label: 'Visé' },
  { value: 'REJETE', label: 'Rejeté' },
  { value: 'ORDONNANCE', label: 'Ordonnancé' },
  { value: 'ANNULE', label: 'Annulé' },
]

function KPICard({ label, valeur, couleur }: { label: string; valeur: number | string; couleur?: string }) {
  return (
    <div className={cn('rounded-lg border p-4', couleur ?? 'bg-white border-slate-200')}>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-base font-semibold text-slate-900">{valeur}</p>
    </div>
  )
}

export function EngagementsPage() {
  const navigate = useNavigate()
  const { profil } = useAuth()
  const { exerciceActif } = useTenant()

  const [statut, setStatut] = useState<StatutEngagement | ''>('')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [annulerId, setAnnulerId] = useState<string | null>(null)
  const [annulerMotif, setAnnulerMotif] = useState('')

  const filtres = useMemo(() => ({
    statut: statut || undefined,
    exerciceId: exerciceActif?.id,
    search: searchDebounced || undefined,
  }), [statut, exerciceActif?.id, searchDebounced])

  const { data: engagements = [], isLoading } = useEngagements(filtres)
  const soumettre = useSoumettreEngagement()
  const annuler = useAnnulerEngagement()

  const handleSearch = useCallback((v: string) => {
    setSearch(v)
    const t = setTimeout(() => setSearchDebounced(v), 300)
    return () => clearTimeout(t)
  }, [])

  const stats = useMemo(() => ({
    totalMontant: engagements.reduce((s, e) => s + e.montantEngage, 0),
    countSoumis:  engagements.filter((e) => e.statut === 'EN_ATTENTE_VISA').length,
    countVise:    engagements.filter((e) => e.statut === 'VISE').length,
    countRejete:  engagements.filter((e) => e.statut === 'REJETE').length,
  }), [engagements])

  const colonnes: ColonneDef<Engagement>[] = [
    {
      key: 'numero',
      header: 'Numéro',
      render: (e) => (
        <span className="font-mono text-xs text-indigo-600 font-medium">{e.numero || '—'}</span>
      ),
    },
    {
      key: 'objet',
      header: 'Objet',
      render: (e) => (
        <span className="text-slate-900 text-sm" title={e.objet}>
          {e.objet.length > 50 ? e.objet.slice(0, 50) + '…' : e.objet}
        </span>
      ),
    },
    {
      key: 'fournisseur',
      header: 'Fournisseur',
      render: (e) => <span className="text-slate-500 text-sm">{e.fournisseur ?? '—'}</span>,
    },
    {
      key: 'montant',
      header: 'Montant',
      render: (e) => <MontantGNF montant={e.montantEngage} taille="sm" />,
      className: 'text-right',
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (e) => <StatutBadge statut={e.statut} type="engagement" />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (e) => <span className="text-slate-500 text-xs">{formatDate(e.dateCreation)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="flex items-center gap-1" onClick={(ev) => ev.stopPropagation()}>
          {e.statut === 'BROUILLON' && profil?.roles.some((r) => ['DAFF', 'SAFF', 'SUPER_ADMIN'].includes(r)) && (
            <button
              type="button"
              onClick={() => soumettre.mutate(e.id)}
              className="rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200"
            >
              Soumettre
            </button>
          )}
          {!['ANNULE', 'ORDONNANCE'].includes(e.statut) && (
            <button
              type="button"
              onClick={() => setAnnulerId(e.id)}
              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200"
            >
              Annuler
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Engagements"
        description={`${engagements.length} engagement${engagements.length > 1 ? 's' : ''} · Exercice ${exerciceActif?.annee ?? '—'}`}
        actions={
          <RoleGuard permission={PERMISSIONS.ENGAGEMENT_CREATE}>
            <button
              type="button"
              onClick={() => navigate('/engagements/nouveau')}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus size={16} />
              Nouvel engagement
            </button>
          </RoleGuard>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KPICard label="Total engagé" valeur={<MontantGNF montant={stats.totalMontant} taille="md" />} />
        <KPICard label="En attente CF" valeur={stats.countSoumis} couleur="bg-blue-50 border-blue-200" />
        <KPICard label="Visés" valeur={stats.countVise} couleur="bg-green-50 border-green-200" />
        <KPICard label="Rejetés" valeur={stats.countRejete} couleur="bg-red-50 border-red-200" />
      </div>

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <select
            aria-label="Filtrer par statut"
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutEngagement | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par objet…"
            className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={() => { setStatut(''); setSearch(''); setSearchDebounced('') }}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Réinitialiser
          </button>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={engagements}
        isLoading={isLoading}
        getRowKey={(e) => e.id}
        onRowClick={(e) => navigate(`/engagements/${e.id}`)}
      />

      {/* Dialog annulation */}
      {annulerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAnnulerId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Annuler l'engagement</h2>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motif d'annulation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={annulerMotif}
              onChange={(e) => setAnnulerMotif(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Expliquez la raison de l'annulation…"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setAnnulerId(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button
                type="button"
                disabled={annulerMotif.trim().length < 5}
                onClick={() => {
                  annuler.mutate({ id: annulerId!, motif: annulerMotif })
                  setAnnulerId(null)
                  setAnnulerMotif('')
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmer l'annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
