import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Lock, CheckCircle, FileText, Archive } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { formatDate } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import {
  useExercicesAdmin,
  useUpdateStatutExercice,
  useCreerExercice,
} from '../hooks/useAdministration'
import type { ExerciceBudgetaire } from '../types'

type ConfirmAction = {
  exercice: ExerciceBudgetaire
  cible: ExerciceBudgetaire['statut']
} | null

const STATUT_CONFIG: Record<ExerciceBudgetaire['statut'], { label: string; color: string }> = {
  OUVERT:   { label: 'Ouvert',   color: 'bg-blue-100 text-blue-700' },
  APPROUVE: { label: 'Approuvé', color: 'bg-green-100 text-green-700' },
  RECTIFIE: { label: 'Rectifié (LFR)', color: 'bg-amber-100 text-amber-700' },
  CLOTURE:  { label: 'Clôturé', color: 'bg-red-100 text-red-700' },
  ARCHIVE:  { label: 'Archivé',  color: 'bg-slate-100 text-slate-500' },
}

export function ExercicesPage() {
  const navigate = useNavigate()
  const { data: exercices = [], isLoading } = useExercicesAdmin()
  const majStatut     = useUpdateStatutExercice()
  const creerExercice = useCreerExercice()

  const [showCreate, setShowCreate]   = useState(false)
  const [nouvelAnnee, setNouvelAnnee] = useState(new Date().getFullYear() + 1)
  const [confirmAction, setConfirm]   = useState<ConfirmAction>(null)
  const [confirmCloture, setConfirmCloture] = useState<ExerciceBudgetaire | null>(null)
  const [clotureInput, setClotureInput]     = useState('')

  const isClotureConfirmed = confirmCloture
    ? clotureInput === String(confirmCloture.annee)
    : false

  function doMajStatut() {
    if (!confirmAction) return
    majStatut.mutate(
      { id: confirmAction.exercice.id, statut: confirmAction.cible },
      { onSuccess: () => setConfirm(null) }
    )
  }

  function doCloture() {
    if (!confirmCloture || !isClotureConfirmed) return
    majStatut.mutate(
      { id: confirmCloture.id, statut: 'CLOTURE' },
      { onSuccess: () => { setConfirmCloture(null); setClotureInput('') } }
    )
  }

  const labelCible = confirmAction
    ? STATUT_CONFIG[confirmAction.cible]?.label ?? confirmAction.cible
    : ''

  return (
    <div>
      <PageHeader
        titre="Exercices budgétaires"
        description="Gestion du cycle de vie des exercices"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus size={16} /> Créer un exercice
            </button>
            <button type="button" onClick={() => navigate('/administration')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={16} /> Administration
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {exercices.map((ex) => {
            const cfg = STATUT_CONFIG[ex.statut]
            return (
              <div key={ex.id}
                className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{ex.annee}</p>
                    <p className="text-xs text-slate-400">Exercice</p>
                  </div>
                  <div>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.color)}>
                      {cfg.label}
                    </span>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                      <span>Ouvert le {formatDate(ex.dateOuverture)}</span>
                      {ex.dateCloture && <span>· Clôturé le {formatDate(ex.dateCloture)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* OUVERT → APPROUVE */}
                  {ex.statut === 'OUVERT' && (
                    <button type="button"
                      onClick={() => setConfirm({ exercice: ex, cible: 'APPROUVE' })}
                      className="flex items-center gap-1.5 rounded-md border border-green-200 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50">
                      <CheckCircle size={12} /> Approuver (LFI)
                    </button>
                  )}
                  {/* OUVERT/APPROUVE → RECTIFIE */}
                  {(ex.statut === 'APPROUVE') && (
                    <button type="button"
                      onClick={() => setConfirm({ exercice: ex, cible: 'RECTIFIE' })}
                      className="flex items-center gap-1.5 rounded-md border border-amber-200 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50">
                      <FileText size={12} /> Rectifier (LFR)
                    </button>
                  )}
                  {/* Non clôturé → CLOTURE (confirmation forte) */}
                  {!['CLOTURE', 'ARCHIVE'].includes(ex.statut) && (
                    <button type="button"
                      onClick={() => { setConfirmCloture(ex); setClotureInput('') }}
                      className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">
                      <Lock size={12} /> Clôturer
                    </button>
                  )}
                  {/* CLOTURE → ARCHIVE */}
                  {ex.statut === 'CLOTURE' && (
                    <button type="button"
                      onClick={() => setConfirm({ exercice: ex, cible: 'ARCHIVE' })}
                      className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                      <Archive size={12} /> Archiver
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {exercices.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Aucun exercice budgétaire.</p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation simple (approuver / rectifier / archiver) */}
      <ConfirmDialog
        ouvert={!!confirmAction}
        titre={`${labelCible} l'exercice ${confirmAction?.exercice.annee}`}
        description={`Confirmer le passage au statut "${labelCible}" pour l'exercice ${confirmAction?.exercice.annee} ?`}
        onConfirm={doMajStatut}
        onCancel={() => setConfirm(null)}
        labelConfirm={labelCible}
      />

      {/* Confirmation clôture — saisie du nom de l'exercice */}
      {confirmCloture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmCloture(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Lock size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Clôturer l'exercice {confirmCloture.annee}</h2>
                <p className="text-sm text-red-600 font-medium">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              La clôture empêchera tout nouvel engagement sur cet exercice.
              Tapez <strong>{confirmCloture.annee}</strong> pour confirmer.
            </p>
            <input
              type="text"
              value={clotureInput}
              onChange={(e) => setClotureInput(e.target.value)}
              placeholder={`Tapez ${confirmCloture.annee}`}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmCloture(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button type="button"
                disabled={!isClotureConfirmed || majStatut.isPending}
                onClick={doCloture}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                {majStatut.isPending ? 'Clôture…' : 'Confirmer la clôture'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal créer exercice */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Créer un exercice budgétaire</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Année</label>
              <input
                type="number"
                value={nouvelAnnee}
                onChange={(e) => setNouvelAnnee(Number(e.target.value))}
                min={2020} max={2100}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button type="button"
                disabled={creerExercice.isPending}
                onClick={() => creerExercice.mutate(nouvelAnnee, { onSuccess: () => setShowCreate(false) })}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {creerExercice.isPending ? 'Création…' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
