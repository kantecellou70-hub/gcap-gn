import { useState } from 'react'
import { X, TrendingUp, FileText, CreditCard, ArrowUpDown } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { formatGNF } from '@/shared/lib/utils'
import { useEvolutionMensuelle } from '../hooks/useM9'
import type { ExecutionMinistere } from '../types'

type Onglet = 'budget' | 'engagements' | 'paiements' | 'recettes'

const MOIS_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const PIE_COLORS = ['#009A44', '#FCD116', '#6366f1', '#94a3b8']

interface Props {
  ministere: ExecutionMinistere
  onClose: () => void
}

function BudgetOnglet({ m }: { m: ExecutionMinistere }) {
  const tauxConsomme = m.dotation_totale > 0
    ? Math.round((m.credits_consommes / m.dotation_totale) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">Crédits consommés / Dotation initiale</span>
          <span className="font-medium">{tauxConsomme}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${Math.min(tauxConsomme, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{formatGNF(m.credits_consommes)}</span>
          <span>{formatGNF(m.dotation_totale)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="RAL" value={formatGNF(m.ral)} sublabel="Restes à Liquider" color="text-amber-600" />
        <StatCard label="RAP" value={formatGNF(m.rap)} sublabel="Restes à Payer" color="text-red-600" />
        <StatCard label="Engagements visés" value={String(m.nb_engagements_vises)} sublabel="dossiers" />
        <StatCard label="En attente visa" value={String(m.nb_engagements_en_attente)} sublabel="dossiers" />
      </div>
    </div>
  )
}

function EngagementsOnglet({ m }: { m: ExecutionMinistere }) {
  const total = m.montant_engage_vise + m.nb_engagements_en_attente
  const pieData = [
    { name: 'Visés', value: m.nb_engagements_vises },
    { name: 'En attente', value: m.nb_engagements_en_attente },
  ].filter((d) => d.value > 0)

  return (
    <div className="space-y-6">
      {pieData.length > 0 ? (
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
                <span className="text-slate-600">{d.name}</span>
                <span className="font-medium ml-auto">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Aucun engagement</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Montant engagé visé" value={formatGNF(m.montant_engage_vise)} />
        <StatCard label="Taux engagement" value={`${m.taux_engagement_pct}%`} />
      </div>

      {m.nb_engagements_en_attente > 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded p-2">
          {m.nb_engagements_en_attente} engagement(s) en attente de visa CF
        </p>
      )}
      {total === 0 && (
        <p className="text-xs text-slate-400">Total engagements : {total}</p>
      )}
    </div>
  )
}

function PaiementsOnglet({ m }: { m: ExecutionMinistere }) {
  const { data, isLoading } = useEvolutionMensuelle(m.tenant_id, m.annee)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Mandats payés" value={formatGNF(m.montant_paye)} color="text-green-600" />
        <StatCard label="En cours (EMIS)" value={formatGNF(m.montant_en_cours_paiement)} color="text-amber-600" />
        <StatCard label="Taux d'exécution" value={`${m.taux_execution_pct}%`} />
        <StatCard label="Liquidé" value={formatGNF(m.montant_liquide)} />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Évolution mensuelle</p>
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tickFormatter={(v: number) => MOIS_LABELS[v - 1]} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`} />
              <Tooltip
                formatter={(value, name) => [formatGNF(Number(value ?? 0)), name === 'montant_paye' ? 'Payé' : 'Engagé']}
                labelFormatter={(l) => MOIS_LABELS[Number(l) - 1]}
              />
              <Line type="monotone" dataKey="montant_paye" stroke="#009A44" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="montant_engage" stroke="#6366f1" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function RecettesOnglet({ m }: { m: ExecutionMinistere }) {
  const tauxRecouvrement = m.recettes_constatees > 0
    ? Math.round((m.recettes_recouvrees / m.recettes_constatees) * 100)
    : 0

  const chartData = [
    { name: 'Constatées', value: m.recettes_constatees },
    { name: 'Recouvrées', value: m.recettes_recouvrees },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">Taux de recouvrement</span>
          <span className="font-medium">{tauxRecouvrement}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.min(tauxRecouvrement, 100)}%` }}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}M`} />
          <Tooltip formatter={(v) => formatGNF(Number(v ?? 0))} />
          <Bar dataKey="value" fill="#009A44" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Constatées" value={formatGNF(m.recettes_constatees)} />
        <StatCard label="Recouvrées" value={formatGNF(m.recettes_recouvrees)} color="text-green-600" />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sublabel,
  color = 'text-slate-900',
}: {
  label: string
  value: string
  sublabel?: string
  color?: string
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`font-semibold text-sm truncate ${color}`}>{value}</p>
      {sublabel && <p className="text-[10px] text-slate-400">{sublabel}</p>}
    </div>
  )
}

const ONGLETS: { id: Onglet; label: string; icon: React.ElementType }[] = [
  { id: 'budget',      label: 'Budget',       icon: TrendingUp },
  { id: 'engagements', label: 'Engagements',  icon: FileText },
  { id: 'paiements',   label: 'Paiements',    icon: CreditCard },
  { id: 'recettes',    label: 'Recettes',     icon: ArrowUpDown },
]

export function MinistreDrawer({ ministere, onClose }: Props) {
  const [onglet, setOnglet] = useState<Onglet>('budget')

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex">
      <button
        className="flex-1 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fermer"
      />
      <aside className="w-96 bg-white shadow-xl flex flex-col overflow-hidden">
        {/* En-tête */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 leading-tight">{ministere.ministere_nom}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Exercice {ministere.annee} · {ministere.ministere_code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-slate-100">
          {ONGLETS.map((o) => {
            const Icon = o.icon
            return (
              <button
                key={o.id}
                onClick={() => setOnglet(o.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  onglet === o.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={14} />
                {o.label}
              </button>
            )
          })}
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-5">
          {onglet === 'budget'      && <BudgetOnglet m={ministere} />}
          {onglet === 'engagements' && <EngagementsOnglet m={ministere} />}
          {onglet === 'paiements'   && <PaiementsOnglet m={ministere} />}
          {onglet === 'recettes'    && <RecettesOnglet m={ministere} />}
        </div>
      </aside>
    </div>
  )
}
