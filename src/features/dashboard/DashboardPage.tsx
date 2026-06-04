import { useNavigate } from 'react-router-dom'
import {
  Wallet, FileText, Clock, CheckCircle, AlertTriangle,
  Banknote, Send, ArrowRight, TrendingDown,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { StatutBadge } from '@/shared/components/StatutBadge'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import { useEngagements, useEngagementsEnAttenteVisa } from '@/features/engagements/hooks/useEngagements'
import { useLignesBudgetaires } from '@/features/budget/hooks/useBudget'
import { useLiquidations } from '@/features/liquidations/hooks/useLiquidations'
import { useMandats } from '@/features/ordonnancement/hooks/useOrdonnancement'
import { canDo, formatDate } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'

// ─── Funnel "Cycle de la dépense" ────────────────────────────────────────────

interface EtapeFunnel {
  label: string
  montant: number
  couleur: string
  barColor: string
}

function CycleDepenseFunnel({ etapes, isLoading }: { etapes: EtapeFunnel[]; isLoading: boolean }) {
  const max = Math.max(...etapes.map((e) => e.montant), 1)

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Cycle de la dépense</h3>
        <p className="text-xs text-slate-500 mt-0.5">Montants à chaque étape du cycle budgétaire</p>
      </div>
      <div className="p-5 space-y-4">
        {etapes.map((etape, i) => {
          const pct = max > 0 ? Math.round((etape.montant / max) * 100) : 0
          return (
            <div key={etape.label}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${etape.barColor}`} />
                  <span className="text-sm font-medium text-slate-700">{etape.label}</span>
                  {i < etapes.length - 1 && (
                    <ArrowRight size={12} className="text-slate-300" />
                  )}
                </div>
                {isLoading ? (
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                ) : (
                  <span className={`text-sm font-mono font-semibold tabular-nums ${etape.couleur}`}>
                    {etape.montant.toLocaleString('fr-GN')} GNF
                  </span>
                )}
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                {isLoading ? (
                  <div className="h-full bg-slate-200 animate-pulse rounded-full" />
                ) : (
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${etape.barColor} w-[var(--bar-w,0%)]`}
                    style={{ '--bar-w': `${pct}%` } as React.CSSProperties}
                  />
                )}
              </div>
            </div>
          )
        })}
        {!isLoading && etapes[0].montant > 0 && etapes[etapes.length - 1].montant > 0 && (
          <p className="text-xs text-slate-400 pt-1">
            Taux de paiement :{' '}
            <span className="font-semibold text-slate-600">
              {Math.round((etapes[etapes.length - 1].montant / etapes[0].montant) * 100)}%
            </span>{' '}
            du total engagé
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Dashboard principal ─────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate   = useNavigate()
  const { profil } = useAuth()
  const { tenant, exerciceActif } = useTenant()
  const roles = profil?.roles ?? []

  const { data: engagements = [],   isLoading: loadingEng  } = useEngagements(
    exerciceActif ? { exerciceId: exerciceActif.id } : {}
  )
  const { data: enAttenteVisa = [], isLoading: loadingVisa } = useEngagementsEnAttenteVisa()
  const { data: lignes = [],        isLoading: loadingBudget } = useLignesBudgetaires(
    exerciceActif?.id ?? ''
  )
  const { data: liquidations = [],  isLoading: loadingLiq  } = useLiquidations()
  const { data: mandats = [],       isLoading: loadingMandats } = useMandats()

  const isCF = canDo(PERMISSIONS.ENGAGEMENT_VISA, roles)

  // ─── Calculs budgétaires ─────────────────────────────────────────────────
  const totalBudget    = lignes.reduce((s, l) => s + l.creditRevise, 0)
  const totalEngage    = engagements.reduce((s, e) => s + e.montantEngage, 0)
  const countVise      = engagements.filter((e) => e.statut === 'VISE').length
  const lignesEpuisees = lignes.filter((l) => l.creditDisponible <= 0).length

  // ─── Calculs M3 Liquidations ──────────────────────────────────────────────
  const liquidationsValidees  = liquidations.filter((l) => l.statut === 'VALIDEE')
  const liquidationsSoumises  = liquidations.filter((l) => l.statut === 'SOUMISE')
  const totalLiquide          = liquidationsValidees.reduce((s, l) => s + l.montantNet, 0)

  // ─── Calculs M4 Mandats ───────────────────────────────────────────────────
  const mandatsActifs         = mandats.filter((m) => m.statut !== 'ANNULE' && m.statut !== 'REJETE' && m.statut !== 'REJETE_TRESOR')
  const mandatsEnAttenteTresor= mandats.filter((m) => m.statut === 'EMIS' || m.statut === 'TRANSMIS_TRESOR')
  const mandatsPrisEnCharge   = mandats.filter((m) => m.statut === 'PRIS_EN_CHARGE')
  const mandatsPaies          = mandats.filter((m) => m.statut === 'PAYE')
  const totalMandats          = mandatsActifs.reduce((s, m) => s + m.montant, 0)
  const totalPaye             = mandatsPaies.reduce((s, m) => s + m.montant, 0)
  const rap                   = (
    mandatsEnAttenteTresor.reduce((s, m) => s + m.montant, 0) +
    mandatsPrisEnCharge.reduce((s, m) => s + m.montant, 0)
  )

  const loading = loadingEng || loadingLiq || loadingMandats

  // ─── Données funnel ───────────────────────────────────────────────────────
  const etapesFunnel: EtapeFunnel[] = [
    { label: 'Engagé',   montant: totalEngage,  couleur: 'text-amber-600',  barColor: 'bg-amber-400' },
    { label: 'Liquidé',  montant: totalLiquide, couleur: 'text-indigo-600', barColor: 'bg-indigo-400' },
    { label: 'Mandaté',  montant: totalMandats, couleur: 'text-violet-600', barColor: 'bg-violet-400' },
    { label: 'Payé',     montant: totalPaye,    couleur: 'text-green-600',  barColor: 'bg-green-500' },
  ]

  const greeting = profil
    ? `Bonjour, ${profil.prenom} ${profil.nom}`
    : 'Tableau de bord'

  return (
    <div>
      <PageHeader
        titre={greeting}
        description={tenant ? `${tenant.nom} · Exercice ${exerciceActif?.annee ?? '—'}` : ''}
      />

      {/* Alerte exercice absent */}
      {!exerciceActif && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="shrink-0" />
          Aucun exercice budgétaire ouvert. Contactez l'administrateur.
        </div>
      )}

      {!isCF ? (
        <>
          {/* ─── Ligne 1 : KPIs Budget + Engagement ─────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <CarteKPI
              titre="Budget total"
              valeur={totalBudget}
              couleur="slate"
              icone={Wallet}
              isLoading={loadingBudget}
            />
            <CarteKPI
              titre="Total engagé"
              valeur={totalEngage}
              couleur="amber"
              icone={FileText}
              isLoading={loadingEng}
            />
            <CarteKPI
              titre="En attente CF"
              valeur={enAttenteVisa.length}
              couleur="indigo"
              icone={Clock}
              isLoading={loadingVisa}
            />
            <CarteKPI
              titre="Visés"
              valeur={countVise}
              couleur="green"
              icone={CheckCircle}
              isLoading={loadingEng}
            />
          </div>

          {/* ─── Ligne 2 : KPIs M3 / M4 ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <CarteKPI
              titre="Total liquidé (M3)"
              valeur={totalLiquide}
              couleur="indigo"
              icone={CheckCircle}
              isLoading={loadingLiq}
              sousTitre="Liquidations validées"
            />
            <CarteKPI
              titre="Mandats en attente Trésor"
              valeur={mandatsEnAttenteTresor.length}
              couleur="amber"
              icone={Send}
              isLoading={loadingMandats}
              sousTitre="Émis ou transmis"
            />
            <CarteKPI
              titre="Restes à payer (RAP)"
              valeur={rap}
              couleur="red"
              icone={TrendingDown}
              isLoading={loadingMandats}
              sousTitre="Mandats non encore payés"
            />
          </div>

          {/* Alerte lignes épuisées */}
          {lignesEpuisees > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {lignesEpuisees} ligne{lignesEpuisees > 1 ? 's' : ''} budgétaire{lignesEpuisees > 1 ? 's' : ''} épuisée{lignesEpuisees > 1 ? 's' : ''} — crédit disponible nul.
            </div>
          )}

          {/* ─── Grille : Funnel + Derniers engagements ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CycleDepenseFunnel etapes={etapesFunnel} isLoading={loading} />

            {/* Derniers engagements */}
            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">Derniers engagements</h3>
                <button
                  type="button"
                  onClick={() => navigate('/engagements')}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Voir tout
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {loadingEng ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="px-5 py-3 flex justify-between">
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-24" />
                    </div>
                  ))
                ) : engagements.slice(0, 5).map((e) => (
                  <div
                    key={e.id}
                    onClick={() => navigate(`/engagements/${e.id}`)}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <div>
                      <span className="font-mono text-xs text-indigo-600">{e.numero || '—'}</span>
                      <p className="text-sm text-slate-800 mt-0.5 truncate max-w-xs">{e.objet}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <MontantGNF montant={e.montantEngage} taille="sm" />
                      <span className="block text-xs text-slate-500 mt-0.5">{e.statut}</span>
                    </div>
                  </div>
                ))}
                {!loadingEng && engagements.length === 0 && (
                  <p className="text-center py-8 text-sm text-slate-400">Aucun engagement pour cet exercice.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ─── Vue CF ────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CarteKPI
              titre="En attente de visa"
              valeur={enAttenteVisa.length}
              couleur="amber"
              icone={Clock}
              isLoading={loadingVisa}
              sousTitre="Engagements à traiter"
            />
            <CarteKPI
              titre="Visés ce mois"
              valeur={countVise}
              couleur="green"
              icone={CheckCircle}
              isLoading={loadingEng}
            />
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/visa-cf')}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Accéder à l'interface de visa →
            </button>
          </div>

          {/* Liquidations soumises à validation */}
          <div className="bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-700">Liquidations soumises à validation</h3>
                {liquidationsSoumises.length > 0 && (
                  <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
                    {liquidationsSoumises.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => navigate('/liquidations')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Voir tout
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {loadingLiq ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-3 flex justify-between">
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-28" />
                  </div>
                ))
              ) : liquidationsSoumises.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400">Aucune liquidation en attente de validation.</p>
              ) : (
                liquidationsSoumises.slice(0, 6).map((l) => (
                  <div
                    key={l.id}
                    onClick={() => navigate(`/liquidations/${l.id}`)}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer"
                  >
                    <div>
                      <span className="font-mono text-xs text-indigo-600">{l.numero || '—'}</span>
                      <p className="text-sm text-slate-800 mt-0.5 truncate max-w-xs">
                        {l.engagement?.objet ?? l.engagement?.fournisseur ?? '—'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Service fait : {formatDate(l.dateServiceFait)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <MontantGNF montant={l.montantNet} taille="sm" />
                      <StatutBadge statut={l.statut} type="liquidation" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
