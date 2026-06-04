import { useState, useMemo } from 'react'
import { Download, FileText, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { useTenant } from '@/app/contexts/TenantContext'
import { formatDate } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import { useLignesBudgetaires } from '@/features/budget/hooks/useBudget'
import { useExercicesAdmin } from '@/features/administration/hooks/useAdministration'
import { exporterComptesAdminPDF } from '@/features/reporting/utils/exports'
import { useRAL, useRAP } from '../hooks/useComptesAdmin'
import type { RALEngagement, RAPMandat, SyntheseTitre } from '../types'
import type { StatutMandat } from '@/shared/types'

type Section = 'synthese' | 'ral' | 'rap'

export function CompteAdminPage() {
  const { tenant } = useTenant()
  const { data: exercices = [], isLoading: loadExercices } = useExercicesAdmin()
  const [exerciceId, setExerciceId] = useState('')
  const [section, setSection]       = useState<Section>('synthese')

  const exerciceSelectionne = exercices.find((e) => e.id === exerciceId)

  // Exercices éligibles au compte admin (CLOTURE, APPROUVE, ARCHIVE)
  const exercicesEligibles = exercices.filter((e) =>
    ['CLOTURE', 'APPROUVE', 'RECTIFIE', 'ARCHIVE'].includes(e.statut)
  )

  const { data: lignes = [],   isLoading: lBudget } = useLignesBudgetaires(exerciceId)
  const { data: ral = [],      isLoading: lRAL }    = useRAL(exerciceId)
  const { data: rap = [],      isLoading: lRAP }    = useRAP()

  // Synthèse par titre budgétaire
  const synthese: SyntheseTitre[] = useMemo(() => {
    const map = new Map<string, SyntheseTitre>()
    for (const l of lignes) {
      const cur = map.get(l.codeTitre) ?? {
        codeTitre: l.codeTitre,
        creditsVotes:    0,
        creditsRevises:  0,
        montantEngage:   0,
        montantLiquide:  0,
        montantOrdonnance: 0,
      }
      cur.creditsVotes     += l.creditInitial
      cur.creditsRevises   += l.creditRevise
      cur.montantEngage    += l.montantEngage
      cur.montantLiquide   += l.montantLiquide
      cur.montantOrdonnance+= l.montantOrdonnance
      map.set(l.codeTitre, cur)
    }
    return Array.from(map.values()).sort((a, b) => a.codeTitre.localeCompare(b.codeTitre))
  }, [lignes])

  const totaux = useMemo(() => synthese.reduce(
    (acc, s) => ({
      creditsVotes:     acc.creditsVotes     + s.creditsVotes,
      creditsRevises:   acc.creditsRevises   + s.creditsRevises,
      montantEngage:    acc.montantEngage    + s.montantEngage,
      montantLiquide:   acc.montantLiquide   + s.montantLiquide,
      montantOrdonnance:acc.montantOrdonnance+ s.montantOrdonnance,
    }),
    { creditsVotes: 0, creditsRevises: 0, montantEngage: 0, montantLiquide: 0, montantOrdonnance: 0 }
  ), [synthese])

  function handleExportPDF() {
    if (!exerciceSelectionne || !tenant) return
    exporterComptesAdminPDF(exerciceSelectionne, tenant, lignes)
  }

  // Colonnes synthèse
  const colSynthese: ColonneDef<SyntheseTitre>[] = [
    { key: 'titre', header: 'Titre', render: (s) => <span className="font-mono text-indigo-600 font-medium">Titre {s.codeTitre}</span> },
    { key: 'votes', header: 'Crédits votés', render: (s) => <MontantGNF montant={s.creditsVotes} taille="sm" couleur="muted" />, className: 'text-right' },
    { key: 'revises', header: 'Crédits révisés', render: (s) => <MontantGNF montant={s.creditsRevises} taille="sm" />, className: 'text-right' },
    { key: 'engage', header: 'Engagé', render: (s) => <MontantGNF montant={s.montantEngage} taille="sm" />, className: 'text-right' },
    { key: 'liquide', header: 'Liquidé', render: (s) => <MontantGNF montant={s.montantLiquide} taille="sm" />, className: 'text-right' },
    { key: 'ordonnance', header: 'Ordonnancé', render: (s) => <MontantGNF montant={s.montantOrdonnance} taille="sm" couleur="success" />, className: 'text-right' },
    {
      key: 'taux',
      header: 'Taux',
      render: (s) => {
        const pct = s.creditsRevises > 0 ? Math.round(s.montantOrdonnance / s.creditsRevises * 100) : 0
        return (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full w-16 overflow-hidden">
              <div
                className={cn('h-full rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-indigo-500')}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{pct}%</span>
          </div>
        )
      },
      className: 'min-w-[110px]',
    },
  ]

  // Colonnes RAL
  const colRAL: ColonneDef<RALEngagement>[] = [
    { key: 'numero', header: 'N° Engagement', render: (r) => <span className="font-mono text-xs text-indigo-600">{r.numero}</span> },
    { key: 'objet', header: 'Objet', render: (r) => <span className="text-sm text-slate-800 truncate max-w-[200px] block">{r.objet}</span> },
    { key: 'fournisseur', header: 'Fournisseur', render: (r) => <span className="text-sm text-slate-500">{r.fournisseur ?? '—'}</span> },
    { key: 'engage', header: 'Montant engagé', render: (r) => <MontantGNF montant={r.montantEngage} taille="sm" />, className: 'text-right' },
    { key: 'liquide', header: 'Liquidé', render: (r) => <MontantGNF montant={r.montantLiquide} taille="sm" couleur="muted" />, className: 'text-right' },
    { key: 'ral', header: 'RAL', render: (r) => <MontantGNF montant={r.ral} taille="sm" couleur="danger" />, className: 'text-right font-semibold' },
  ]

  // Colonnes RAP
  const colRAP: ColonneDef<RAPMandat>[] = [
    { key: 'numero', header: 'N° Mandat', render: (r) => <span className="font-mono text-xs text-indigo-600">{r.numero}</span> },
    { key: 'liquidation', header: 'Liquidation', render: (r) => <span className="font-mono text-xs text-slate-500">{r.liquidationNumero}</span> },
    { key: 'objet', header: 'Engagement', render: (r) => <span className="text-sm text-slate-700 truncate max-w-[200px] block">{r.engagementObjet}</span> },
    { key: 'beneficiaire', header: 'Bénéficiaire', render: (r) => <span className="text-sm text-slate-600">{r.beneficiaire}</span> },
    { key: 'montant', header: 'Montant', render: (r) => <MontantGNF montant={r.montant} taille="sm" couleur="danger" />, className: 'text-right' },
    { key: 'statut', header: 'Statut', render: (r) => <StatutBadge statut={r.statut as StatutMandat} type="mandat" /> },
    { key: 'dateEmission', header: 'Émis le', render: (r) => <span className="text-xs text-slate-400">{formatDate(r.dateEmission)}</span> },
  ]

  const totalRAL = ral.reduce((s, r) => s + r.ral, 0)
  const totalRAP = rap.reduce((s, r) => s + r.montant, 0)

  const SECTIONS: { id: Section; label: string; count?: number }[] = [
    { id: 'synthese', label: 'Synthèse budgétaire' },
    { id: 'ral',      label: `Restes à Liquider (${ral.length})` },
    { id: 'rap',      label: `Restes à Payer (${rap.length})` },
  ]

  return (
    <div>
      <PageHeader
        titre="Compte administratif"
        description="Récapitulatif officiel de l'exécution budgétaire"
        actions={
          exerciceId ? (
            <button type="button" onClick={handleExportPDF}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Download size={16} /> Générer le compte admin PDF
            </button>
          ) : undefined
        }
      />

      {/* Sélecteur exercice */}
      <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Sélectionner un exercice
        </label>
        {loadExercices ? (
          <div className="h-10 w-64 bg-slate-100 rounded-lg animate-pulse" />
        ) : exercicesEligibles.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-amber-600">
            <AlertCircle size={16} />
            Aucun exercice clôturé ou approuvé. Clôturez un exercice pour générer son compte administratif.
          </div>
        ) : (
          <select
            aria-label="Sélectionner l'exercice"
            value={exerciceId}
            onChange={(e) => setExerciceId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[280px]"
          >
            <option value="">— Choisir un exercice —</option>
            {exercicesEligibles.map((e) => (
              <option key={e.id} value={e.id}>
                Exercice {e.annee} — {e.statut}
              </option>
            ))}
          </select>
        )}

        {exerciceSelectionne && (
          <div className="mt-3 flex flex-wrap gap-6 text-sm text-slate-600">
            <span>Ouvert le {formatDate(exerciceSelectionne.dateOuverture)}</span>
            {exerciceSelectionne.dateCloture && (
              <span>Clôturé le {formatDate(exerciceSelectionne.dateCloture)}</span>
            )}
            <span className="font-medium text-indigo-600">{tenant?.nom}</span>
          </div>
        )}
      </div>

      {/* Contenu après sélection */}
      {exerciceId && (
        <>
          {/* KPIs rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Budget total</p>
              <MontantGNF montant={totaux.creditsRevises} taille="md" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-red-500 mb-1">Restes à Liquider (RAL)</p>
              <MontantGNF montant={totalRAL} taille="md" couleur="danger" />
              <p className="text-xs text-slate-400 mt-0.5">{ral.length} engagement{ral.length > 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-amber-500 mb-1">Restes à Payer (RAP)</p>
              <MontantGNF montant={totalRAP} taille="md" couleur="danger" />
              <p className="text-xs text-slate-400 mt-0.5">{rap.length} mandat{rap.length > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Onglets sections */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
            {SECTIONS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSection(s.id)}
                className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors', {
                  'bg-white text-slate-900 shadow-sm': section === s.id,
                  'text-slate-600 hover:text-slate-800': section !== s.id,
                })}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Synthèse */}
          {section === 'synthese' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700">Résumé exécution budgétaire par titre</h3>
                </div>
                <DataTable
                  colonnes={colSynthese}
                  donnees={synthese}
                  isLoading={lBudget}
                  getRowKey={(s) => s.codeTitre}
                />
                {/* Ligne totaux */}
                {synthese.length > 0 && (
                  <div className="border-t-2 border-slate-200 bg-slate-50 px-4 py-3 flex justify-end gap-8 text-sm font-semibold text-slate-700">
                    <span className="text-slate-500 mr-auto">TOTAUX</span>
                    <MontantGNF montant={totaux.creditsVotes}     taille="sm" couleur="muted" />
                    <MontantGNF montant={totaux.creditsRevises}   taille="sm" />
                    <MontantGNF montant={totaux.montantEngage}    taille="sm" />
                    <MontantGNF montant={totaux.montantLiquide}   taille="sm" />
                    <MontantGNF montant={totaux.montantOrdonnance} taille="sm" couleur="success" />
                    <span className="w-[110px]" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RAL */}
          {section === 'ral' && (
            <div className="space-y-4">
              {ral.length === 0 && !lRAL ? (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-5 py-4 text-sm text-green-700">
                  <FileText size={16} />
                  Aucun reste à liquider — tous les engagements visés ont été totalement liquidés.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Total RAL : <span className="font-semibold text-red-600">{totalRAL.toLocaleString('fr-GN')} GNF</span>
                    </p>
                  </div>
                  <DataTable
                    colonnes={colRAL}
                    donnees={ral}
                    isLoading={lRAL}
                    getRowKey={(r) => r.id}
                  />
                </>
              )}
            </div>
          )}

          {/* RAP */}
          {section === 'rap' && (
            <div className="space-y-4">
              {rap.length === 0 && !lRAP ? (
                <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-100 px-5 py-4 text-sm text-green-700">
                  <FileText size={16} />
                  Aucun reste à payer — tous les mandats émis ont été payés ou annulés.
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                      Total RAP : <span className="font-semibold text-amber-600">{totalRAP.toLocaleString('fr-GN')} GNF</span>
                    </p>
                  </div>
                  <DataTable
                    colonnes={colRAP}
                    donnees={rap}
                    isLoading={lRAP}
                    getRowKey={(r) => r.id}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Placeholder si pas de sélection */}
      {!exerciceId && !loadExercices && exercicesEligibles.length > 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Sélectionnez un exercice pour afficher son compte administratif.</p>
        </div>
      )}
    </div>
  )
}
