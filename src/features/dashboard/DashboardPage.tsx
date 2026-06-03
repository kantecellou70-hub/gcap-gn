import { useNavigate } from 'react-router-dom'
import { Wallet, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { CarteKPI } from '@/shared/components/CarteKPI'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import { useEngagements, useEngagementsEnAttenteVisa } from '@/features/engagements/hooks/useEngagements'
import { useLignesBudgetaires } from '@/features/budget/hooks/useBudget'
import { canDo } from '@/shared/lib/utils'
import { PERMISSIONS } from '@/shared/constants/permissions'

export function DashboardPage() {
  const navigate = useNavigate()
  const { profil } = useAuth()
  const { tenant, exerciceActif } = useTenant()
  const roles = profil?.roles ?? []

  const { data: engagements = [], isLoading: loadingEng } = useEngagements(
    exerciceActif ? { exerciceId: exerciceActif.id } : {}
  )
  const { data: enAttenteVisa = [], isLoading: loadingVisa } = useEngagementsEnAttenteVisa()
  const { data: lignes = [], isLoading: loadingBudget } = useLignesBudgetaires(
    exerciceActif?.id ?? ''
  )

  const isCF = canDo(PERMISSIONS.ENGAGEMENT_VISA, roles)

  // Calculs
  const totalBudget    = lignes.reduce((s, l) => s + l.creditRevise, 0)
  const totalEngage    = engagements.reduce((s, e) => s + e.montantEngage, 0)
  const countVise      = engagements.filter((e) => e.statut === 'VISE').length
  const lignesEpuisees = lignes.filter((l) => l.creditDisponible <= 0).length

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

      {/* KPIs selon rôle */}
      {!isCF ? (
        <>
          {/* Vue Ordonnateur / DAFF */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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

          {/* Alerte lignes épuisées */}
          {lignesEpuisees > 0 && (
            <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertTriangle size={16} className="shrink-0" />
              {lignesEpuisees} ligne{lignesEpuisees > 1 ? 's' : ''} budgétaire{lignesEpuisees > 1 ? 's' : ''} épuisée{lignesEpuisees > 1 ? 's' : ''} — crédit disponible nul.
            </div>
          )}

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
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900 font-mono tabular-nums">
                      {e.montantEngage.toLocaleString('fr-GN')} GNF
                    </p>
                    <span className="text-xs text-slate-500">{e.statut}</span>
                  </div>
                </div>
              ))}
              {!loadingEng && engagements.length === 0 && (
                <p className="text-center py-8 text-sm text-slate-400">Aucun engagement pour cet exercice.</p>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Vue CF */
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
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
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/visa-cf')}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Accéder à l'interface de visa →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
