import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Package, AlertTriangle, Layers, Banknote } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useAuth } from '@/app/contexts/AuthContext'
import { formatDate } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import { useBiens, useSyncSicom } from '../hooks/useBiens'
import { EtatBienBadge } from '../components/EtatBienBadge'
import { SicomSyncBadge } from '../components/SicomSyncBadge'
import {
  CATEGORIE_LABELS, CATEGORIE_COLORS,
  CATEGORIES_OPTIONS, ETATS_OPTIONS,
  ROLES_MATIERES_GERER,
} from '../constants'
import type { Bien, CategorieBien, EtatBien } from '../types'

export function MatieresPage() {
  const navigate    = useNavigate()
  const { profil }  = useAuth()
  const syncSicom   = useSyncSicom()

  const [categorieFiltre, setCategorieFiltre] = useState<CategorieBien | ''>('')
  const [etatFiltre, setEtatFiltre]           = useState<EtatBien | ''>('')
  const [recherche, setRecherche]             = useState('')

  const filtres = useMemo(() => ({
    actif:     true,
    categorie: categorieFiltre || undefined,
    etat:      etatFiltre || undefined,
    search:    recherche || undefined,
  }), [categorieFiltre, etatFiltre, recherche])

  const { data: biens = [], isLoading } = useBiens(filtres)

  const canGerer = profil?.roles.some((r) => ROLES_MATIERES_GERER.includes(r as string)) ?? false

  const stats = useMemo(() => {
    const valeurTotale    = biens.reduce((s, b) => s + b.valeurAcquisition, 0)
    const countAlerte     = biens.filter((b) => b.etat === 'MEDIOCRE' || b.etat === 'HORS_SERVICE').length
    const syncDates       = biens
      .filter((b) => b.sicomSyncAt)
      .map((b) => b.sicomSyncAt!)
      .sort()
    const dernierSyncAt   = syncDates[syncDates.length - 1]
    const dateSyncLabel   = dernierSyncAt
      ? formatDate(dernierSyncAt)
      : 'Jamais'
    return { valeurTotale, countAlerte, dateSyncLabel, total: biens.length }
  }, [biens])

  const colonnes: ColonneDef<Bien>[] = [
    {
      key: 'codeInventaire',
      header: 'Code inventaire',
      render: (b) => (
        <span className="font-mono text-xs text-indigo-600">{b.codeInventaire}</span>
      ),
    },
    {
      key: 'designation',
      header: 'Désignation',
      render: (b) => (
        <span className="text-sm text-slate-900 truncate max-w-[200px] block font-medium">
          {b.designation}
        </span>
      ),
    },
    {
      key: 'categorie',
      header: 'Catégorie',
      render: (b) => (
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CATEGORIE_COLORS[b.categorie])}>
          {CATEGORIE_LABELS[b.categorie]}
        </span>
      ),
    },
    {
      key: 'marque',
      header: 'Marque / Modèle',
      render: (b) => (
        <span className="text-sm text-slate-500">
          {[b.marque, b.modele].filter(Boolean).join(' ') || '—'}
        </span>
      ),
    },
    {
      key: 'valeurAcquisition',
      header: 'Valeur',
      render: (b) => <MontantGNF montant={b.valeurAcquisition} taille="sm" />,
      className: 'text-right',
    },
    {
      key: 'localisation',
      header: 'Localisation',
      render: (b) => (
        <span className="text-sm text-slate-500 truncate max-w-[140px] block">{b.localisation}</span>
      ),
    },
    {
      key: 'etat',
      header: 'État',
      render: (b) => <EtatBienBadge etat={b.etat} />,
    },
    {
      key: 'sicomId',
      header: 'SICOM',
      render: (b) => <SicomSyncBadge sicomId={b.sicomId} sicomSyncAt={b.sicomSyncAt} />,
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Comptabilité Matières"
        description={`Inventaire des biens — ${stats.total} bien${stats.total > 1 ? 's' : ''} actif${stats.total > 1 ? 's' : ''}`}
        actions={
          canGerer ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => syncSicom.mutate()}
                disabled={syncSicom.isPending}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={15} className={syncSicom.isPending ? 'animate-spin' : ''} />
                Sync SICOM
              </button>
              <button
                type="button"
                onClick={() => navigate('/matieres/nouveau')}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={16} /> Nouveau bien
              </button>
            </div>
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <CarteKPI
          titre="Total biens actifs"
          valeur={String(stats.total)}
          couleur="slate"
          icone={Package}
          isLoading={isLoading}
        />
        <CarteKPI
          titre="Valeur inventaire"
          valeur={stats.valeurTotale}
          couleur="indigo"
          icone={Banknote}
          isLoading={isLoading}
        />
        <CarteKPI
          titre="Biens à surveiller"
          valeur={String(stats.countAlerte)}
          couleur="amber"
          icone={AlertTriangle}
          isLoading={isLoading}
        />
        <CarteKPI
          titre="Dernière sync SICOM"
          valeur={stats.dateSyncLabel}
          couleur="green"
          icone={Layers}
          isLoading={isLoading}
        />
      </div>

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par désignation, code, marque…"
            className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            aria-label="Filtrer par catégorie"
            value={categorieFiltre}
            onChange={(e) => setCategorieFiltre(e.target.value as CategorieBien | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Toutes les catégories</option>
            {CATEGORIES_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            aria-label="Filtrer par état"
            value={etatFiltre}
            onChange={(e) => setEtatFiltre(e.target.value as EtatBien | '')}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les états</option>
            {ETATS_OPTIONS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={biens}
        isLoading={isLoading}
        getRowKey={(b) => b.id}
        onRowClick={(b) => navigate(`/matieres/${b.id}`)}
      />
    </div>
  )
}
