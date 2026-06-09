import { useState } from 'react'
import { FileSpreadsheet, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { formatGNF } from '@/shared/lib/utils'
import { useExecutionNationale, useNationalExercices } from '../hooks/useM9'

export function LolfExportPage() {
  const anneeActuelle = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeActuelle)
  const [exportingXls, setExportingXls] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  const { data: exercices } = useNationalExercices()
  const { data: execution, isLoading, dataUpdatedAt, refetch } = useExecutionNationale(annee)

  const annees = exercices
    ? [...new Set(exercices.map((e) => e.annee))].sort((a, b) => b - a)
    : [anneeActuelle]

  const donnees = execution ?? []
  const national = exercices?.find((e) => e.annee === annee)
  const derniereMaj = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString('fr-GN') : '—'

  async function handleExcelExport() {
    setExportingXls(true)
    try {
      const { exportLolfExcel } = await import('../lib/lolfExport')
      await exportLolfExcel(annee, donnees)
    } finally {
      setExportingXls(false)
    }
  }

  async function handlePdfExport() {
    if (!national) return
    setExportingPdf(true)
    try {
      const { exportLolfPdf } = await import('../lib/lolfExport')
      await exportLolfPdf(annee, donnees, national)
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export LOLF — Loi de Règlement</h1>
        <p className="text-sm text-slate-500 mt-1">
          Tableau d'exécution budgétaire national — République de Guinée
        </p>
      </div>

      {/* Sélecteur exercice */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Exercice :</label>
        <select
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {annees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Récapitulatif avant export */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Récapitulatif des données</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            Chargement…
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Ministères inclus</dt>
              <dd className="font-semibold text-slate-900">{donnees.length}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Dotation nationale</dt>
              <dd className="font-semibold text-slate-900">
                {national ? formatGNF(national.dotation_nationale) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Taux d'exécution global</dt>
              <dd className="font-semibold text-slate-900">
                {national ? `${national.taux_execution_national_pct}%` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Montant payé</dt>
              <dd className="font-semibold text-slate-900">
                {national ? formatGNF(national.montant_paye_national) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Dernière mise à jour</dt>
              <dd className="text-slate-600">{derniereMaj}</dd>
            </div>
          </dl>
        )}
      </div>

      {/* Boutons d'export */}
      <div className="flex gap-4">
        <button
          onClick={handleExcelExport}
          disabled={exportingXls || isLoading || donnees.length === 0}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-4 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <FileSpreadsheet size={18} />
          {exportingXls ? 'Génération…' : 'Télécharger Excel (.xlsx)'}
        </button>

        <button
          onClick={handlePdfExport}
          disabled={exportingPdf || isLoading || donnees.length === 0 || !national}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <FileText size={18} />
          {exportingPdf ? 'Génération…' : 'Télécharger PDF (A4 paysage)'}
        </button>
      </div>

      {/* Avertissement légal */}
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-semibold">Avertissement légal</p>
          <p>
            Ce document est généré à partir des données GCAP-GN.
            Il doit être validé par le MEFB avant transmission à la Cour des Comptes.
          </p>
          <p className="text-xs text-amber-600">
            Référence : Loi Organique relative aux Lois de Finances (LOLF) — République de Guinée
          </p>
        </div>
      </div>
    </div>
  )
}
