import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet } from 'lucide-react'
import { formatGNF } from '@/shared/lib/utils'
import { useTenant } from '@/app/contexts/TenantContext'
import { useExecutionNationale, useNationalExercices } from '../hooks/useM9'
import { MinistreDrawer } from '../components/MinistreDrawer'
import type { ExecutionMinistere } from '../types'

function badgeTaux(taux: number): string {
  if (taux >= 75) return 'bg-green-100 text-green-700'
  if (taux >= 25) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export function M9Page() {
  const anneeActuelle = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeActuelle)
  const [ministereFiltre, setMinistereFiltre] = useState<string>('tous')
  const [ministereSelectionne, setMinistereSelectionne] = useState<ExecutionMinistere | null>(null)
  const [exporting, setExporting] = useState(false)
  const { switchTenant } = useTenant()
  const navigate = useNavigate()

  async function handleVoirM7(tenantId: string) {
    await switchTenant(tenantId)
    navigate('/comptes-admin')
  }

  const { data: exercices } = useNationalExercices()
  const { data: execution, isLoading } = useExecutionNationale(annee)

  const annees = exercices
    ? [...new Set(exercices.map((e) => e.annee))].sort((a, b) => b - a)
    : [anneeActuelle]

  const donnees = execution ?? []

  const donneesFiltrées = ministereFiltre === 'tous'
    ? donnees
    : donnees.filter((m) => m.tenant_id === ministereFiltre)

  async function handleExportExcel() {
    setExporting(true)
    try {
      const { exportLolfExcel } = await import('../lib/lolfExport')
      await exportLolfExcel(annee, donneesFiltrées)
    } finally {
      setExporting(false)
    }
  }

  // Lignes N-1 pour comparaison
  const { data: execN1 } = useExecutionNationale(annee - 1)
  const mapN1 = new Map((execN1 ?? []).map((m) => [m.tenant_id, m]))

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Comptes Administratifs Consolidés — M9</h1>
        <p className="text-sm text-slate-500 mt-1">Agrégation nationale de tous les M7 ministériels</p>
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Exercice budgétaire"
          value={annee}
          onChange={(e) => setAnnee(Number(e.target.value))}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {annees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          aria-label="Filtrer par ministère"
          value={ministereFiltre}
          onChange={(e) => setMinistereFiltre(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="tous">Tous les ministères</option>
          {donnees.map((m) => (
            <option key={m.tenant_id} value={m.tenant_id}>{m.ministere_nom}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleExportExcel}
          disabled={exporting || isLoading || donneesFiltrées.length === 0}
          className="ml-auto flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <FileSpreadsheet size={15} />
          {exporting ? 'Export…' : 'Exporter Excel'}
        </button>
      </div>

      {/* Tableau M9 détaillé */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Ministère</th>
                <th className="px-4 py-3 text-right">Dotation</th>
                <th className="px-4 py-3 text-right">Engagé</th>
                <th className="px-4 py-3 text-right">Liquidé</th>
                <th className="px-4 py-3 text-right">Payé</th>
                <th className="px-4 py-3 text-right">RAL</th>
                <th className="px-4 py-3 text-right">RAP</th>
                <th className="px-4 py-3 text-center">Taux exec.</th>
                <th className="px-4 py-3 text-right">Comp. N-1</th>
                <th className="px-4 py-3 text-center">M7</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  </td>
                </tr>
              ) : donneesFiltrées.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">Aucune donnée</td>
                </tr>
              ) : (
                donneesFiltrées.map((m) => {
                  const n1 = mapN1.get(m.tenant_id)
                  const delta = n1
                    ? m.taux_execution_pct - n1.taux_execution_pct
                    : null

                  return (
                    <tr
                      key={m.tenant_id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setMinistereSelectionne(m)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{m.ministere_nom}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatGNF(m.dotation_totale)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatGNF(m.montant_engage_vise)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatGNF(m.montant_liquide)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{formatGNF(m.montant_paye)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-amber-700">{formatGNF(m.ral)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatGNF(m.rap)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeTaux(m.taux_execution_pct)}`}>
                          {m.taux_execution_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs">
                        {delta !== null ? (
                          <span className={delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {delta >= 0 ? '+' : ''}{delta}pts
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handleVoirM7(m.tenant_id) }}
                          className="text-xs text-indigo-500 hover:underline"
                        >
                          Voir M7
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>

            {/* Ligne totale */}
            {donneesFiltrées.length > 1 && !isLoading && (
              <tfoot className="bg-slate-100 text-sm font-semibold">
                <tr>
                  <td className="px-4 py-3 text-slate-700">TOTAL</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatGNF(donneesFiltrées.reduce((s, m) => s + m.dotation_totale, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatGNF(donneesFiltrées.reduce((s, m) => s + m.montant_engage_vise, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatGNF(donneesFiltrées.reduce((s, m) => s + m.montant_liquide, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatGNF(donneesFiltrées.reduce((s, m) => s + m.montant_paye, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-amber-700">{formatGNF(donneesFiltrées.reduce((s, m) => s + m.ral, 0))}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-700">{formatGNF(donneesFiltrées.reduce((s, m) => s + m.rap, 0))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Drawer détail ministère */}
      {ministereSelectionne && (
        <MinistreDrawer
          ministere={ministereSelectionne}
          onClose={() => setMinistereSelectionne(null)}
        />
      )}
    </div>
  )
}
