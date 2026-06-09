import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Legend,
} from 'recharts'
import { AlertTriangle, RefreshCw, Building2, TrendingUp, Banknote, Users } from 'lucide-react'
import { formatGNF } from '@/shared/lib/utils'
import { useExecutionNationale, useAlertesNationales, useNationalExercices } from '../hooks/useM9'
import { MinistreDrawer } from '../components/MinistreDrawer'
import type { ExecutionMinistere } from '../types'

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

// Couleurs drapeau guinéen
const COLOR_PAYE    = '#009A44'  // Vert
const COLOR_ENCOURS = '#FCD116'  // Jaune
const COLOR_ENGAGE  = '#6366f1'  // Indigo
const COLOR_LIBRE   = '#e2e8f0'  // Gris

function badgeTaux(taux: number): string {
  if (taux >= 75) return 'bg-green-100 text-green-700'
  if (taux >= 25) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function KpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string
  value: string
  sublabel?: string
  icon: React.ElementType
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
        <Icon size={18} className="text-indigo-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 truncate">{label}</p>
        <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
        {sublabel && <p className="text-xs text-slate-400">{sublabel}</p>}
      </div>
    </div>
  )
}

function ExerciceSelectorRow({
  annee,
  annees,
  onChange,
  onRefresh,
  isRefreshing,
}: {
  annee: number
  annees: number[]
  onChange: (a: number) => void
  onRefresh: () => void
  isRefreshing: boolean
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <select
        value={annee}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {annees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        Rafraîchir
      </button>
    </div>
  )
}

export function DashboardMefbPage() {
  const anneeActuelle = new Date().getFullYear()
  const [annee, setAnnee] = useState(anneeActuelle)
  const [ministereSelectionne, setMinistereSelectionne] = useState<ExecutionMinistere | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: exercices } = useNationalExercices()
  const { data: execution, isLoading: loadingExec, refetch } = useExecutionNationale(annee)
  const { data: alertes } = useAlertesNationales()

  const annees = exercices
    ? [...new Set(exercices.map((e) => e.annee))].sort((a, b) => b - a)
    : [anneeActuelle]

  const national = exercices?.find((e) => e.annee === annee)

  // Données pour graphique barres horizontales
  const barData = (execution ?? []).map((m) => ({
    name: m.ministere_nom.length > 20 ? m.ministere_nom.slice(0, 18) + '…' : m.ministere_nom,
    fullName: m.ministere_nom,
    tenant_id: m.tenant_id,
    paye: m.taux_execution_pct,
    encours: Math.max(0, m.taux_engagement_pct - m.taux_execution_pct),
    engage: Math.max(0, 100 - m.taux_engagement_pct),
  }))

  // Données évolution mensuelle nationale (agrégat)
  const evolutionData = MOIS_LABELS.map((label, i) => ({ mois: label, index: i + 1 }))

  // Pagination tableau
  const totalPages = Math.ceil((execution?.length ?? 0) / PAGE_SIZE)
  const pageData = (execution ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const alertesActives = (alertes ?? []).filter(
    (a) => a.alerte_sous_execution || a.alerte_sur_execution || a.alerte_engagements_bloques
  )

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard National MEFB</h1>
        <p className="text-sm text-slate-500 mt-1">Vue consolidée cross-ministères — SUPER_ADMIN uniquement</p>
      </div>

      {/* Sélecteur d'exercice */}
      <ExerciceSelectorRow
        annee={annee}
        annees={annees}
        onChange={(a) => { setAnnee(a); setPage(1) }}
        onRefresh={() => refetch()}
        isRefreshing={loadingExec}
      />

      {/* KPIs nationaux */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Dotation nationale"
          value={national ? formatGNF(national.dotation_nationale) : '—'}
          icon={Banknote}
        />
        <KpiCard
          label="Taux d'exécution"
          value={national ? `${national.taux_execution_national_pct}%` : '—'}
          icon={TrendingUp}
        />
        <KpiCard
          label="Montant payé"
          value={national ? formatGNF(national.montant_paye_national) : '—'}
          icon={Banknote}
        />
        <KpiCard
          label="Recettes constatées"
          value={national ? formatGNF(national.recettes_constatees_national) : '—'}
          icon={TrendingUp}
        />
        <KpiCard
          label="Recettes recouvrées"
          value={national ? formatGNF(national.recettes_recouvrées_national) : '—'}
          icon={Banknote}
        />
        <KpiCard
          label="Ministères actifs"
          value={national ? String(national.nb_ministeres) : '—'}
          icon={Users}
        />
      </div>

      {/* Alertes nationales */}
      {alertesActives.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="font-semibold text-amber-800">{alertesActives.length} alerte(s) nationale(s) active(s)</h3>
          </div>
          <ul className="space-y-1.5">
            {alertesActives.map((a) => (
              <li key={a.tenant_id} className="text-sm text-amber-700">
                {a.alerte_sous_execution && (
                  <span>• <strong>{a.ministere_nom}</strong> — sous-exécution ({a.taux_execution_pct}% après juillet)</span>
                )}
                {a.alerte_engagements_bloques && (
                  <span>• <strong>{a.ministere_nom}</strong> — {a.nb_engagements_en_attente} engagements bloqués CF</span>
                )}
                {a.alerte_sur_execution && (
                  <span>• <strong>{a.ministere_nom}</strong> — taux {'>'} 95% (risque dépassement)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Graphique barres horizontales */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 size={16} />
          Taux d'exécution par ministère — {annee}
        </h2>
        {loadingExec ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : barData.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center">Aucune donnée pour {annee}</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(barData.length * 36, 120)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => {
                  const labels: Record<string, string> = { paye: 'Payé', encours: 'En cours', engage: 'Non engagé' }
                  return [`${Math.round(Number(value ?? 0))}%`, labels[String(name)] ?? String(name)]
                }}
                labelFormatter={(label) => {
                  const item = barData.find((d) => d.name === String(label))
                  return item?.fullName ?? String(label)
                }}
              />
              <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: '50%', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="paye"    name="Payé"         stackId="a" fill={COLOR_PAYE}    radius={0} />
              <Bar dataKey="encours" name="En cours"     stackId="a" fill={COLOR_ENCOURS} radius={0} />
              <Bar dataKey="engage"  name="Non engagé"   stackId="a" fill={COLOR_LIBRE}   radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tableau des ministères */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Tableau des ministères</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Ministère</th>
                <th className="px-4 py-3 text-right">Dotation</th>
                <th className="px-4 py-3 text-right">Engagé</th>
                <th className="px-4 py-3 text-right">Liquidé</th>
                <th className="px-4 py-3 text-right">Payé</th>
                <th className="px-4 py-3 text-center">Taux exec.</th>
                <th className="px-4 py-3 text-center">Alertes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingExec ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  </td>
                </tr>
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Aucune donnée</td>
                </tr>
              ) : (
                pageData.map((m) => {
                  const alerteM = alertes?.find((a) => a.tenant_id === m.tenant_id)
                  const hasAlerte = alerteM && (
                    alerteM.alerte_sous_execution ||
                    alerteM.alerte_sur_execution ||
                    alerteM.alerte_engagements_bloques
                  )
                  return (
                    <tr
                      key={m.tenant_id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setMinistereSelectionne(m)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{m.ministere_nom}</td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatGNF(m.dotation_totale)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatGNF(m.montant_engage_vise)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatGNF(m.montant_liquide)}</td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatGNF(m.montant_paye)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeTaux(m.taux_execution_pct)}`}>
                          {m.taux_execution_pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasAlerte ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                            <AlertTriangle size={11} className="text-red-600" />
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, execution?.length ?? 0)} sur {execution?.length ?? 0}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Préc.
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Suiv.
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Évolution mensuelle nationale */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-800 mb-4">Évolution nationale mensuelle — {annee}</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={evolutionData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1_000_000_000)}Mrd`} />
            <Tooltip formatter={(v) => formatGNF(Number(v ?? 0))} />
            <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="montant_engage" name="Engagements cumulés" stroke={COLOR_ENGAGE} dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="montant_paye" name="Paiements cumulés" stroke={COLOR_PAYE} dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
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
