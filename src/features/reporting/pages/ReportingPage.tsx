import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
} from 'recharts'
import { Download } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'
import { Wallet, TrendingDown, CheckCircle, Banknote } from 'lucide-react'
import { useLignesBudgetaires } from '@/features/budget/hooks/useBudget'
import { useEngagements } from '@/features/engagements/hooks/useEngagements'
import { useMandats } from '@/features/ordonnancement/hooks/useOrdonnancement'
import { exporterEngagementsExcel, exporterBudgetExcel, exporterComptesAdminPDF } from '../utils/exports'
import type { LigneBudgetaire } from '@/features/budget/types'
import type { StatutEngagement, Engagement, MandatPaiement } from '@/shared/types'

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtMilliards(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}Mrd`
  if (value >= 1_000_000)     return `${(value / 1_000_000).toFixed(0)}M`
  return `${(value / 1_000).toFixed(0)}K`
}

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const STATUT_ENG_COLORS: Record<StatutEngagement, string> = {
  BROUILLON:       '#94a3b8',
  EN_ATTENTE_VISA: '#f59e0b',
  VISE:            '#22c55e',
  REJETE:          '#ef4444',
  LIQUIDE:         '#3b82f6',
  ORDONNANCE:      '#6366f1',
  ANNULE:          '#cbd5e1',
}

const STATUT_ENG_LABELS: Record<StatutEngagement, string> = {
  BROUILLON: 'Brouillon', EN_ATTENTE_VISA: 'En attente visa',
  VISE: 'Visé', REJETE: 'Rejeté', LIQUIDE: 'Liquidé', ORDONNANCE: 'Ordonnancé', ANNULE: 'Annulé',
}

// ─── Onglet Exécution budgétaire ─────────────────────────────────────────────

function OngletExecution({ lignes, isLoading, onExportExcel, onExportPDF }: {
  lignes: LigneBudgetaire[]
  isLoading: boolean
  onExportExcel: () => void
  onExportPDF: () => void
}) {
  // Grouper par codeTitre pour le BarChart
  const barData = useMemo(() => {
    const map = new Map<string, { creditRevise: number; montantEngage: number; montantOrdonnance: number }>()
    for (const l of lignes) {
      const cur = map.get(l.codeTitre) ?? { creditRevise: 0, montantEngage: 0, montantOrdonnance: 0 }
      cur.creditRevise     += l.creditRevise
      cur.montantEngage    += l.montantEngage
      cur.montantOrdonnance+= l.montantOrdonnance
      map.set(l.codeTitre, cur)
    }
    return Array.from(map.entries()).map(([titre, vals]) => ({ name: `T${titre}`, ...vals }))
  }, [lignes])

  // Récapitulatif par titre
  const colonnes: ColonneDef<{ titre: string; creditRevise: number; montantEngage: number; pctEngage: number; montantOrdonnance: number; pctOrdonnance: number }>[] = [
    { key: 'titre', header: 'Titre', render: (r) => <span className="font-mono text-indigo-600">Titre {r.titre}</span> },
    { key: 'creditRevise', header: 'Crédit révisé', render: (r) => <MontantGNF montant={r.creditRevise} taille="sm" couleur="muted" />, className: 'text-right' },
    { key: 'engage', header: 'Engagé', render: (r) => <MontantGNF montant={r.montantEngage} taille="sm" />, className: 'text-right' },
    { key: 'pctEngage', header: '% Engagé', render: (r) => <span className="text-sm text-slate-600">{r.pctEngage.toFixed(1)}%</span>, className: 'text-right' },
    { key: 'ordonnance', header: 'Ordonnancé', render: (r) => <MontantGNF montant={r.montantOrdonnance} taille="sm" couleur="success" />, className: 'text-right' },
    { key: 'pctOrdonnance', header: '% Ordonné', render: (r) => <span className="text-sm text-slate-600">{r.pctOrdonnance.toFixed(1)}%</span>, className: 'text-right' },
  ]

  const titreData = useMemo(() => {
    const map = new Map<string, { creditRevise: number; montantEngage: number; montantOrdonnance: number }>()
    for (const l of lignes) {
      const cur = map.get(l.codeTitre) ?? { creditRevise: 0, montantEngage: 0, montantOrdonnance: 0 }
      cur.creditRevise     += l.creditRevise
      cur.montantEngage    += l.montantEngage
      cur.montantOrdonnance+= l.montantOrdonnance
      map.set(l.codeTitre, cur)
    }
    return Array.from(map.entries()).map(([titre, vals]) => ({
      titre,
      creditRevise:     vals.creditRevise,
      montantEngage:    vals.montantEngage,
      pctEngage:        vals.creditRevise > 0 ? vals.montantEngage / vals.creditRevise * 100 : 0,
      montantOrdonnance:vals.montantOrdonnance,
      pctOrdonnance:    vals.creditRevise > 0 ? vals.montantOrdonnance / vals.creditRevise * 100 : 0,
    }))
  }, [lignes])

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onExportExcel}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <Download size={13} /> Excel
        </button>
        <button type="button" onClick={onExportPDF}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <Download size={13} /> Compte admin PDF
        </button>
      </div>

      {barData.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Exécution par titre budgétaire</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtMilliards} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value) => fmtMilliards(value as number)}
                contentStyle={{ fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="creditRevise"      name="Crédits"     fill="#94a3b8" />
              <Bar dataKey="montantEngage"     name="Engagé"      fill="#f59e0b" />
              <Bar dataKey="montantOrdonnance" name="Ordonnancé"  fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !isLoading && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-8 text-center text-sm text-slate-400">
            Aucune ligne budgétaire pour l'exercice en cours.
          </div>
        )
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Récapitulatif par titre</h3>
        </div>
        <DataTable
          colonnes={colonnes}
          donnees={titreData}
          isLoading={isLoading}
          getRowKey={(r) => r.titre}
        />
      </div>
    </div>
  )
}

// ─── Onglet Engagements ───────────────────────────────────────────────────────

function OngletEngagements({ engagements, isLoading, onExportExcel }: {
  engagements: Engagement[]
  isLoading: boolean
  onExportExcel: () => void
}) {
  // PieChart par statut
  const pieData = useMemo(() => {
    const counts = new Map<StatutEngagement, number>()
    for (const e of engagements) {
      counts.set(e.statut, (counts.get(e.statut) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .filter(([, v]) => v > 0)
      .map(([statut, count]) => ({ name: STATUT_ENG_LABELS[statut], value: count, statut }))
  }, [engagements])

  // LineChart évolution mensuelle
  const lineData = useMemo(() => {
    const monthly = new Array(12).fill(0)
    for (const e of engagements) {
      const m = new Date(e.dateCreation).getMonth()
      monthly[m] += e.montantEngage
    }
    return monthly.map((montant, i) => ({ mois: MOIS_LABELS[i], montant }))
  }, [engagements])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={onExportExcel}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
          <Download size={13} /> Exporter Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PieChart statuts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribution par statut</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="value" label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}>
                  {pieData.map((entry) => (
                    <Cell key={entry.statut} fill={STATUT_ENG_COLORS[entry.statut as StatutEngagement] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            !isLoading && <p className="text-center text-sm text-slate-400 py-8">Aucun engagement.</p>
          )}
        </div>

        {/* LineChart évolution mensuelle */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Évolution mensuelle (GNF engagé)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtMilliards} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => fmtMilliards(v as number)} contentStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="montant" name="Engagé" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Mandats ───────────────────────────────────────────────────────────

function OngletMandats({ mandats, isLoading }: {
  mandats: MandatPaiement[]
  isLoading: boolean
}) {
  // AreaChart par semaine
  const areaData = useMemo(() => {
    const weekly = new Map<number, number>()
    for (const m of mandats) {
      const d = new Date(m.dateEmission)
      const start = new Date(d.getFullYear(), 0, 1)
      const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
      weekly.set(week, (weekly.get(week) ?? 0) + m.montant)
    }
    return Array.from(weekly.entries())
      .sort(([a], [b]) => a - b)
      .map(([semaine, montant]) => ({ semaine: `S${semaine}`, montant }))
  }, [mandats])

  // BarChart par mode de paiement
  const modeData = useMemo(() => {
    const counts = new Map<string, { count: number; montant: number }>()
    for (const m of mandats) {
      const mode = m.modePaiement.replace('_', ' ')
      const cur = counts.get(mode) ?? { count: 0, montant: 0 }
      cur.count++
      cur.montant += m.montant
      counts.set(mode, cur)
    }
    return Array.from(counts.entries()).map(([mode, vals]) => ({ mode, ...vals }))
  }, [mandats])

  return (
    <div className="space-y-6">
      {/* AreaChart semaines */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Montants mandatés par semaine</h3>
        {areaData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="semaine" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtMilliards} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => fmtMilliards(v as number)} contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="montant" name="Mandaté" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          !isLoading && <p className="text-center text-sm text-slate-400 py-8">Aucun mandat.</p>
        )}
      </div>

      {/* BarChart mode de paiement */}
      {modeData.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Mandats par mode de paiement</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={modeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tickFormatter={fmtMilliards} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="mode" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v) => fmtMilliards(v as number)} contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="montant" name="Montant total" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Comparatif ────────────────────────────────────────────────────────

function OngletComparatif({ tenant, lignes }: {
  tenant: ReturnType<typeof useTenant>['tenant']
  lignes: LigneBudgetaire[]
}) {
  const totaux = lignes.reduce(
    (acc, l) => ({ credits: acc.credits + l.creditRevise, engage: acc.engage + l.montantEngage, ordonnance: acc.ordonnance + l.montantOrdonnance }),
    { credits: 0, engage: 0, ordonnance: 0 }
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-700">
        La vue multi-tenant est disponible pour les <strong>SUPER_ADMIN</strong> uniquement. Seules les données du tenant courant sont affichées.
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {['Ministère', 'Budget', 'Engagé', '%', 'Ordonnancé', '%'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-800">{tenant?.nom ?? '—'}</td>
              <td className="px-4 py-3"><MontantGNF montant={totaux.credits} taille="sm" couleur="muted" /></td>
              <td className="px-4 py-3"><MontantGNF montant={totaux.engage}  taille="sm" /></td>
              <td className="px-4 py-3 text-slate-600">
                {totaux.credits > 0 ? `${(totaux.engage / totaux.credits * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="px-4 py-3"><MontantGNF montant={totaux.ordonnance} taille="sm" couleur="success" /></td>
              <td className="px-4 py-3 text-slate-600">
                {totaux.credits > 0 ? `${(totaux.ordonnance / totaux.credits * 100).toFixed(1)}%` : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

type Onglet = 'execution' | 'engagements' | 'mandats' | 'comparatif'

const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'execution',   label: 'Exécution budgétaire' },
  { id: 'engagements', label: 'Engagements' },
  { id: 'mandats',     label: 'Mandats' },
  { id: 'comparatif',  label: 'Comparatif' },
]

export function ReportingPage() {
  const [ongletActif, setOngletActif] = useState<Onglet>('execution')
  const { exerciceActif, tenant } = useTenant()
  useAuth()

  const { data: lignes = [],      isLoading: lBudget }  = useLignesBudgetaires(exerciceActif?.id ?? '')
  const { data: engagements = [], isLoading: lEng }     = useEngagements(exerciceActif ? { exerciceId: exerciceActif.id } : {})
  const { data: mandats = [],     isLoading: lMandats } = useMandats()

  const isLoading = lBudget || lEng || lMandats

  const totaux = useMemo(() => ({
    credits:    lignes.reduce((s, l) => s + l.creditRevise, 0),
    engage:     lignes.reduce((s, l) => s + l.montantEngage, 0),
    ordonnance: lignes.reduce((s, l) => s + l.montantOrdonnance, 0),
    payes:      mandats.filter((m) => m.statut === 'PAYE').reduce((s, m) => s + m.montant, 0),
  }), [lignes, mandats])

  const tauxExec = totaux.credits > 0 ? Math.round(totaux.ordonnance / totaux.credits * 100 * 10) / 10 : 0

  function handleExportBudgetExcel() {
    exporterBudgetExcel(lignes, String(exerciceActif?.annee ?? 'N/A'), `budget_${exerciceActif?.annee ?? 'N-A'}.xlsx`)
  }

  function handleExportEngagementsExcel() {
    exporterEngagementsExcel(engagements, `engagements_${exerciceActif?.annee ?? 'N-A'}.xlsx`)
  }

  function handleExportComptesAdminPDF() {
    if (!exerciceActif || !tenant) return
    exporterComptesAdminPDF(exerciceActif, tenant, lignes)
  }

  return (
    <div>
      <PageHeader
        titre="Reporting budgétaire"
        description={exerciceActif
          ? `Exercice ${exerciceActif.annee} · Taux d'exécution : ${tauxExec}%`
          : 'Aucun exercice actif'}
      />

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <CarteKPI titre="Budget total"  valeur={totaux.credits}    couleur="slate"  icone={Wallet}      isLoading={isLoading} />
        <CarteKPI titre="Engagé"        valeur={totaux.engage}     couleur="amber"  icone={TrendingDown} isLoading={isLoading} />
        <CarteKPI titre="Ordonnancé"    valeur={totaux.ordonnance} couleur="indigo" icone={CheckCircle}  isLoading={isLoading} />
        <CarteKPI titre="Payé"          valeur={totaux.payes}      couleur="green"  icone={Banknote}     isLoading={isLoading} />
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOngletActif(o.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              ongletActif === o.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      {ongletActif === 'execution' && (
        <OngletExecution
          lignes={lignes}
          isLoading={lBudget}
          onExportExcel={handleExportBudgetExcel}
          onExportPDF={handleExportComptesAdminPDF}
        />
      )}
      {ongletActif === 'engagements' && (
        <OngletEngagements
          engagements={engagements ?? []}
          isLoading={lEng}
          onExportExcel={handleExportEngagementsExcel}
        />
      )}
      {ongletActif === 'mandats' && (
        <OngletMandats mandats={mandats ?? []} isLoading={lMandats} />
      )}
      {ongletActif === 'comparatif' && (
        <OngletComparatif tenant={tenant} lignes={lignes} />
      )}
    </div>
  )
}
