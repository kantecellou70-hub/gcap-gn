import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useAuth } from '@/app/contexts/AuthContext'
import { cn } from '@/shared/lib/utils'
import { formatDate, formatDateTime } from '@/shared/lib/utils'
import {
  useRecette,
  useConstaterRecette,
  useRecouvrerRecette,
  useAnnulerRecette,
} from '../hooks/useRecettes'
import {
  STATUT_RECETTE_LABELS, STATUT_RECETTE_COLORS,
  TYPE_RECETTE_LABELS, TYPE_RECETTE_COLORS,
  ROLES_RECETTE_CREATE, ROLES_RECETTE_VALIDATE,
} from '../constants'

type DialogType = 'constater' | 'recouvrer' | 'annuler' | null

function LigneInfo({ label, children, bold = false }: {
  label: string; children: React.ReactNode; bold?: boolean
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-800'}`}>
        {children}
      </span>
    </div>
  )
}

export function RecetteDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { profil } = useAuth()

  const { data: recette, isLoading, error } = useRecette(id!)
  const constater  = useConstaterRecette()
  const recouvrer  = useRecouvrerRecette()
  const annuler    = useAnnulerRecette()

  const [dialog, setDialog]       = useState<DialogType>(null)
  const [montant, setMontant]     = useState('')
  const [dateConstat, setDate]    = useState('')

  const roles     = profil?.roles ?? []
  const canCreate = roles.some((r) => ROLES_RECETTE_CREATE.includes(r as string))
  const canValid  = roles.some((r) => ROLES_RECETTE_VALIDATE.includes(r as string))

  if (isLoading) return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
    </div>
  )

  if (error || !recette) return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
      <AlertTriangle size={16} /> Recette introuvable.
    </div>
  )

  const isPrevue    = recette.statut === 'PREVUE'
  const isConstatee = recette.statut === 'CONSTATEE'
  const isPending   = constater.isPending || recouvrer.isPending || annuler.isPending

  function doAction(type: DialogType) {
    if (!id) return
    switch (type) {
      case 'constater':
        if (!montant || !dateConstat) return
        constater.mutate({ id, montant: Number(montant), date: dateConstat }, { onSuccess: () => setDialog(null) })
        break
      case 'recouvrer':
        if (!montant) return
        recouvrer.mutate({ id, montant: Number(montant) }, { onSuccess: () => setDialog(null) })
        break
      case 'annuler':
        annuler.mutate(id, { onSuccess: () => navigate('/recettes') })
        break
    }
  }

  return (
    <div>
      <PageHeader
        titre={recette.numero || recette.libelle}
        description={recette.libelle}
        actions={
          <button type="button" onClick={() => navigate('/recettes')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      {/* Statut + type */}
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUT_RECETTE_COLORS[recette.statut])}>
          {STATUT_RECETTE_LABELS[recette.statut]}
        </span>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', TYPE_RECETTE_COLORS[recette.typeRecette])}>
          {TYPE_RECETTE_LABELS[recette.typeRecette]}
        </span>
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
        {isPrevue && canCreate && (
          <button type="button" onClick={() => { setMontant(String(recette.montantPrevu)); setDialog('constater') }}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
            <CheckCircle size={16} /> Constater la recette
          </button>
        )}
        {isConstatee && canValid && (
          <button type="button" onClick={() => { setMontant(String(recette.montantConstate)); setDialog('recouvrer') }}
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            <CheckCircle size={16} /> Enregistrer le recouvrement
          </button>
        )}
        {(isPrevue || isConstatee) && canCreate && (
          <button type="button" onClick={() => setDialog('annuler')} disabled={isPending}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            <XCircle size={16} /> Annuler
          </button>
        )}
      </div>

      {/* Corps */}
      <div className="max-w-2xl bg-white border border-slate-200 rounded-xl p-5">
        <div className="space-y-3 text-sm">
          <LigneInfo label="Numéro">
            <span className="font-mono text-indigo-600">{recette.numero}</span>
          </LigneInfo>
          <LigneInfo label="Libellé" ><span className="font-medium">{recette.libelle}</span></LigneInfo>
          <LigneInfo label="Débiteur">{recette.debiteur}</LigneInfo>
          {recette.dateConstatation && (
            <LigneInfo label="Date constatation">{formatDate(recette.dateConstatation)}</LigneInfo>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <LigneInfo label="Montant prévu">
              <MontantGNF montant={recette.montantPrevu} taille="sm" couleur="muted" />
            </LigneInfo>
            <LigneInfo label="Montant constaté">
              <MontantGNF montant={recette.montantConstate} taille="sm" />
            </LigneInfo>
            <LigneInfo label="Montant recouvré" bold>
              <MontantGNF montant={recette.montantRecouvre} taille="sm" couleur="success" />
            </LigneInfo>
          </div>

          {recette.observations && (
            <div className="border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500 mb-1">Observations</p>
              <p className="text-slate-700">{recette.observations}</p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-500">
            <LigneInfo label="Créée le">{formatDateTime(recette.createdAt)}</LigneInfo>
            {recette.createur && (
              <LigneInfo label="Créée par">
                {recette.createur.prenom} {recette.createur.nom}
              </LigneInfo>
            )}
          </div>
        </div>
      </div>

      {/* ─── Dialogues ─────────────────────────────────────────────── */}

      <ConfirmDialog
        ouvert={dialog === 'annuler'}
        titre="Annuler la recette"
        description="L'annulation est définitive. Confirmer ?"
        onConfirm={() => doAction('annuler')}
        onCancel={() => setDialog(null)}
        variant="danger"
        labelConfirm="Annuler la recette"
        labelCancel="Non, conserver"
      />

      {/* Dialog constatation */}
      {dialog === 'constater' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Constater la recette</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant constaté (GNF) <span className="text-red-500">*</span>
                </label>
                <input type="number" min={1} value={montant} onChange={(e) => setMontant(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de constatation <span className="text-red-500">*</span>
                </label>
                <input type="date" value={dateConstat} onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Annuler</button>
              <button type="button" disabled={!montant || !dateConstat || constater.isPending}
                onClick={() => doAction('constater')}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50">
                {constater.isPending ? 'Enregistrement…' : 'Constater'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog recouvrement */}
      {dialog === 'recouvrer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Enregistrer le recouvrement</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Montant recouvré (GNF) <span className="text-red-500">*</span>
              </label>
              <input type="number" min={1} value={montant} onChange={(e) => setMontant(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Annuler</button>
              <button type="button" disabled={!montant || recouvrer.isPending}
                onClick={() => doAction('recouvrer')}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                {recouvrer.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
