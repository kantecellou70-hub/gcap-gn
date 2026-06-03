import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useMutationCreerLigneBudgetaire } from '../hooks/useBudget'
import { useTenant } from '@/app/contexts/TenantContext'

const ligneBudgetaireSchema = z.object({
  codeTitre:     z.string().min(1, 'Requis'),
  codeChapitre:  z.string().min(1, 'Requis'),
  codeArticle:   z.string().min(1, 'Requis'),
  codeParagraphe:z.string().optional(),
  libelle:       z.string().min(3, 'Libellé trop court'),
  typeCredit:    z.enum(['FONCTIONNEMENT', 'INVESTISSEMENT', 'TRANSFERT']),
  creditInitial: z.number({ invalid_type_error: 'Entier requis' }).int().min(0, 'Le crédit doit être positif'),
})

type FormData = z.infer<typeof ligneBudgetaireSchema>

interface LigneBudgetaireFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function LigneBudgetaireForm({ onSuccess, onCancel }: LigneBudgetaireFormProps) {
  const { exerciceActif } = useTenant()
  const mutation = useMutationCreerLigneBudgetaire()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(ligneBudgetaireSchema),
    defaultValues: { typeCredit: 'FONCTIONNEMENT', creditInitial: 0 },
  })

  async function onSubmit(data: FormData) {
    if (!exerciceActif) return
    await mutation.mutateAsync({
      exerciceId:    exerciceActif.id,
      codeTitre:     data.codeTitre,
      codeChapitre:  data.codeChapitre,
      codeArticle:   data.codeArticle,
      codeParagraphe:data.codeParagraphe,
      libelle:       data.libelle,
      typeCredit:    data.typeCredit,
      creditInitial: data.creditInitial,
    })
    onSuccess?.()
  }

  const inputCls = (hasError: boolean) =>
    cn(
      'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
      hasError ? 'border-red-400' : 'border-slate-300'
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Nomenclature */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
          <input {...register('codeTitre')} placeholder="ex: 1" className={inputCls(!!errors.codeTitre)} />
          {errors.codeTitre && <p className="mt-1 text-xs text-red-600">{errors.codeTitre.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Chapitre</label>
          <input {...register('codeChapitre')} placeholder="ex: 10" className={inputCls(!!errors.codeChapitre)} />
          {errors.codeChapitre && <p className="mt-1 text-xs text-red-600">{errors.codeChapitre.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Article</label>
          <input {...register('codeArticle')} placeholder="ex: 101" className={inputCls(!!errors.codeArticle)} />
          {errors.codeArticle && <p className="mt-1 text-xs text-red-600">{errors.codeArticle.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Paragraphe <span className="text-slate-400">(optionnel)</span></label>
          <input {...register('codeParagraphe')} placeholder="ex: 1011" className={inputCls(false)} />
        </div>
      </div>

      {/* Libellé */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Libellé</label>
        <input {...register('libelle')} placeholder="Intitulé de la ligne budgétaire" className={inputCls(!!errors.libelle)} />
        {errors.libelle && <p className="mt-1 text-xs text-red-600">{errors.libelle.message}</p>}
      </div>

      {/* Type crédit + Montant */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type de crédit</label>
          <select {...register('typeCredit')} className={inputCls(false)}>
            <option value="FONCTIONNEMENT">Fonctionnement</option>
            <option value="INVESTISSEMENT">Investissement</option>
            <option value="TRANSFERT">Transfert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Crédit initial (GNF)</label>
          <input
            {...register('creditInitial', { valueAsNumber: true })}
            type="number"
            min={0}
            step={1}
            className={inputCls(!!errors.creditInitial)}
          />
          {errors.creditInitial && <p className="mt-1 text-xs text-red-600">{errors.creditInitial.message}</p>}
        </div>
      </div>

      {mutation.error && (
        <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {(isSubmitting || mutation.isPending) && <Loader2 size={14} className="animate-spin" />}
          Créer la ligne
        </button>
      </div>
    </form>
  )
}
