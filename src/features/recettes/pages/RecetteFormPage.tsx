import { useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { useTenant } from '@/app/contexts/TenantContext'
import { useCreerRecette } from '../hooks/useRecettes'
import { TYPES_RECETTE_OPTIONS } from '../constants'

const schema = z.object({
  typeRecette:       z.enum(['REDEVANCE', 'VENTE_SERVICE', 'REMBOURSEMENT', 'DON', 'AUTRE']),
  libelle:           z.string().min(5, 'Libellé trop court (min 5 caractères)').max(255),
  montantPrevu:      z.coerce.number().int().positive('Montant prévu obligatoire'),
  debiteur:          z.string().min(2, 'Débiteur obligatoire').max(255),
  exerciceId:        z.string().uuid('Exercice invalide'),
  ligneBudgetaireId: z.string().uuid().optional().or(z.literal('')),
  dateConstatation:  z.string().optional(),
  observations:      z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof schema>

export function RecetteFormPage() {
  const navigate           = useNavigate()
  const { exerciceActif }  = useTenant()
  const creer              = useCreerRecette()

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      typeRecette: 'REDEVANCE',
      exerciceId:  exerciceActif?.id ?? '',
    },
  })

  function onSubmit(values: FormValues) {
    creer.mutate(
      {
        ...values,
        exerciceId:        values.exerciceId,
        ligneBudgetaireId: values.ligneBudgetaireId || undefined,
      },
      { onSuccess: () => navigate('/recettes') }
    )
  }

  function handleCancel() {
    if (isDirty && !confirm('Des modifications non enregistrées seront perdues. Continuer ?')) return
    navigate('/recettes')
  }

  return (
    <div>
      <PageHeader
        titre="Nouvelle recette non fiscale"
        description="Saisie d'une recette propre du ministère"
        actions={
          <button type="button" onClick={handleCancel}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">

          {/* Type de recette */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type de recette <span className="text-red-500">*</span>
            </label>
            <select {...register('typeRecette')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {TYPES_RECETTE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Libellé */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input type="text" {...register('libelle')}
              placeholder="Description de la recette"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.libelle && <p className="mt-1 text-xs text-red-600">{errors.libelle.message}</p>}
          </div>

          {/* Débiteur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Débiteur / Redevable <span className="text-red-500">*</span>
            </label>
            <input type="text" {...register('debiteur')}
              placeholder="Nom ou raison sociale du débiteur"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.debiteur && <p className="mt-1 text-xs text-red-600">{errors.debiteur.message}</p>}
          </div>

          {/* Montant prévu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Montant prévu (GNF) <span className="text-red-500">*</span>
            </label>
            <input type="number" min={1} {...register('montantPrevu')}
              placeholder="Ex : 2 500 000"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.montantPrevu && <p className="mt-1 text-xs text-red-600">{errors.montantPrevu.message}</p>}
          </div>

          {/* Date de constatation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de constatation
            </label>
            <input type="date" {...register('dateConstatation')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Exercice (caché si déjà connu) */}
          <input type="hidden" {...register('exerciceId')} />

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observations</label>
            <textarea {...register('observations')} rows={3}
              placeholder="Contexte, références légales, remarques…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {!exerciceActif && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              Aucun exercice actif — la recette sera associée à un exercice invalide.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={creer.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {creer.isPending ? 'Enregistrement…' : 'Créer la recette'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
