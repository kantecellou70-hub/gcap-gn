import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { useTenant } from '@/app/contexts/TenantContext'
import { formatGNF, cn } from '@/shared/lib/utils'
import { useLignesBudgetaires, useExercices } from '@/features/budget/hooks/useBudget'
import { useCreerEngagement } from '../hooks/useEngagements'

const engagementSchema = z.object({
  objet:              z.string().min(10, "Décrivez l'objet (min 10 caractères)").max(255),
  exerciceId:         z.string().min(1, 'Sélectionnez un exercice'),
  ligneBudgetaireId:  z.string().min(1, 'Sélectionnez une ligne budgétaire'),
  fournisseur:        z.string().max(300).optional(),
  montantEngage:      z.number({ error: 'Entier requis' }).int().positive('Le montant doit être positif'),
  referenceMarche:    z.string().max(100).optional(),
  referenceBonCmd:    z.string().max(100).optional(),
  dateEcheance:       z.string().optional(),
  observations:       z.string().max(1000).optional(),
})

type FormData = z.infer<typeof engagementSchema>

const inputCls = (hasError: boolean) =>
  cn(
    'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
    hasError ? 'border-red-400' : 'border-slate-300'
  )

export function EngagementFormPage() {
  const navigate = useNavigate()
  const { exerciceActif } = useTenant()
  const { data: exercices = [] } = useExercices()
  const creer = useCreerEngagement()
  const [showCancel, setShowCancel] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(engagementSchema),
    defaultValues: {
      exerciceId: exerciceActif?.id ?? '',
      montantEngage: 0,
    },
  })

  const exerciceIdWatch  = watch('exerciceId')
  const ligneIdWatch     = watch('ligneBudgetaireId')
  const montantWatch     = watch('montantEngage')

  const { data: lignes = [] } = useLignesBudgetaires(exerciceIdWatch)
  const ligneSel = lignes.find((l) => l.id === ligneIdWatch)
  const creditDispo = ligneSel?.creditDisponible ?? 0
  const depasse = montantWatch > 0 && montantWatch > creditDispo

  async function onSubmit(data: FormData, statut: 'BROUILLON' | 'EN_ATTENTE_VISA') {
    await creer.mutateAsync({
      input: {
        objet:             data.objet,
        exerciceId:        data.exerciceId,
        ligneBudgetaireId: data.ligneBudgetaireId,
        fournisseur:       data.fournisseur,
        referenceMarche:   data.referenceMarche,
        referenceBonCmd:   data.referenceBonCmd,
        dateEcheance:      data.dateEcheance,
        observations:      data.observations,
        montantEngage:     data.montantEngage,
      },
      statut,
    })
    navigate('/engagements')
  }

  return (
    <div>
      <PageHeader titre="Nouvel engagement" description="Créer un engagement de dépense" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Colonne gauche (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Section Identification */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Identification
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Objet de la dépense <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('objet')}
                  rows={3}
                  className={inputCls(!!errors.objet)}
                  placeholder="Description précise de la dépense…"
                />
                {errors.objet && <p className="mt-1 text-xs text-red-600">{errors.objet.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Réf. marché</label>
                  <input {...register('referenceMarche')} className={inputCls(false)} placeholder="Optionnel" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Réf. bon de commande</label>
                  <input {...register('referenceBonCmd')} className={inputCls(false)} placeholder="Optionnel" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date d'échéance</label>
                  <input {...register('dateEcheance')} type="date" className={inputCls(false)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                  <input {...register('fournisseur')} className={inputCls(false)} placeholder="Nom du fournisseur" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observations</label>
                <textarea {...register('observations')} rows={2} className={inputCls(false)} placeholder="Optionnel" />
              </div>
            </div>
          </div>

          {/* Section Imputation budgétaire */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
              Imputation budgétaire
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Exercice budgétaire <span className="text-red-500">*</span>
                </label>
                <select {...register('exerciceId')} aria-label="Exercice budgétaire" className={inputCls(!!errors.exerciceId)}>
                  <option value="">— Sélectionnez un exercice —</option>
                  {exercices.map((e) => (
                    <option key={e.id} value={e.id}>{e.annee} — {e.statut}</option>
                  ))}
                </select>
                {errors.exerciceId && <p className="mt-1 text-xs text-red-600">{errors.exerciceId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ligne budgétaire <span className="text-red-500">*</span>
                </label>
                <select {...register('ligneBudgetaireId')} aria-label="Ligne budgétaire" className={inputCls(!!errors.ligneBudgetaireId)} disabled={!exerciceIdWatch}>
                  <option value="">— Sélectionnez une ligne —</option>
                  {lignes.map((l) => (
                    <option key={l.id} value={l.id} disabled={l.creditDisponible <= 0}>
                      {l.codeChapitre}.{l.codeArticle} — {l.libelle}
                      {l.creditDisponible <= 0 ? ' (Épuisé)' : ` | Dispo: ${formatGNF(l.creditDisponible)}`}
                    </option>
                  ))}
                </select>
                {errors.ligneBudgetaireId && <p className="mt-1 text-xs text-red-600">{errors.ligneBudgetaireId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant engagé (GNF) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('montantEngage', { valueAsNumber: true })}
                  type="number"
                  min={1}
                  step={1}
                  className={inputCls(!!errors.montantEngage || depasse)}
                />
                {errors.montantEngage && <p className="mt-1 text-xs text-red-600">{errors.montantEngage.message}</p>}
                {depasse && !errors.montantEngage && (
                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Dépassement — disponible : {formatGNF(creditDispo)} GNF
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne droite (1/3) ── */}
        <div className="space-y-4">
          {/* Récapitulatif */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Récapitulatif</h3>
            {ligneSel ? (
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Ligne sélectionnée</p>
                  <p className="font-mono text-xs text-indigo-600">{ligneSel.codeChapitre}.{ligneSel.codeArticle}</p>
                  <p className="text-slate-800 text-xs mt-0.5">{ligneSel.libelle}</p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Crédit disponible</p>
                  <MontantGNF montant={creditDispo} taille="md" couleur={depasse ? 'danger' : 'success'} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Montant engagé</p>
                  <MontantGNF montant={montantWatch || 0} taille="md" couleur={depasse ? 'danger' : 'default'} />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Sélectionnez une ligne budgétaire</p>
            )}
          </div>

          {/* Pièces jointes */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Pièces jointes</h3>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center">
              <p className="text-xs text-slate-500 font-medium">Enregistrez d'abord le brouillon</p>
              <p className="text-xs text-slate-400 mt-1">
                Vous pourrez joindre PDF, images, Word, Excel (10 Mo max) depuis la fiche de l'engagement.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() => isDirty ? setShowCancel(true) : navigate('/engagements')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={isSubmitting || creer.isPending}
          onClick={handleSubmit((d) => onSubmit(d, 'BROUILLON'))}
          className="rounded-lg border border-indigo-300 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
          Enregistrer en brouillon
        </button>
        <button
          type="button"
          disabled={isSubmitting || creer.isPending}
          onClick={handleSubmit((d) => onSubmit(d, 'EN_ATTENTE_VISA'))}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {(isSubmitting || creer.isPending) ? <Loader2 size={14} className="animate-spin" /> : null}
          Soumettre au CF
        </button>
      </div>

      <ConfirmDialog
        ouvert={showCancel}
        titre="Abandonner la saisie ?"
        description="Les données non enregistrées seront perdues."
        variant="warning"
        labelConfirm="Abandonner"
        onConfirm={() => navigate('/engagements')}
        onCancel={() => setShowCancel(false)}
      />
    </div>
  )
}
