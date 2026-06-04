import { useEffect, useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useMutationCreerLigneBudgetaire, useNomenclaturesForBudget } from '../hooks/useBudget'
import { useTenant } from '@/app/contexts/TenantContext'
import type { NomenclatureBudgetaire } from '@/shared/types'

const TYPE_CREDIT_LABELS: Record<string, string> = {
  FONCTIONNEMENT: 'Fonctionnement',
  INVESTISSEMENT: 'Investissement',
  TRANSFERT:      'Transfert',
}

const schema = z.object({
  nomenclatureId: z.string().uuid('Sélectionner une nomenclature'),
  creditInitial:  z.coerce.number().int().min(0, 'Le crédit doit être positif'),
})

type FormData = z.infer<typeof schema>

interface LigneBudgetaireFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export function LigneBudgetaireForm({ onSuccess, onCancel }: LigneBudgetaireFormProps) {
  const { exerciceActif }  = useTenant()
  const mutation           = useMutationCreerLigneBudgetaire()
  const { data: nomenclatures = [], isLoading: loadingNom } = useNomenclaturesForBudget()

  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<NomenclatureBudgetaire | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: _errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { creditInitial: 0 },
  })

  const errors = _errors as Record<string, unknown>
  const hasErr = (f: string) => errors[f] != null
  const errMsg = (f: string): string | null => {
    const e = errors[f]
    if (!e || typeof e !== 'object' || !('message' in e)) return null
    const m = (e as { message: unknown }).message
    return typeof m === 'string' ? m : null
  }

  const filtered = nomenclatures.filter((n) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      n.codeArticle.toLowerCase().includes(q) ||
      n.libelleArticle.toLowerCase().includes(q) ||
      n.codeChapitre.toLowerCase().includes(q)
    )
  })

  function pickNomenclature(nom: NomenclatureBudgetaire) {
    setSelected(nom)
    setValue('nomenclatureId', nom.id)
    setSearch(`${nom.codeArticle} — ${nom.libelleArticle}`)
    setShowDropdown(false)
  }

  useEffect(() => {
    if (!showDropdown) return
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Element
      if (!target.closest('[data-nom-combo]')) setShowDropdown(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [showDropdown])

  async function onSubmit(data: FormData) {
    if (!exerciceActif || !selected) return
    await mutation.mutateAsync({
      exerciceId:     exerciceActif.id,
      nomenclatureId: data.nomenclatureId,
      codeTitre:      selected.codeTitre,
      codeChapitre:   selected.codeChapitre,
      codeArticle:    selected.codeArticle,
      codeParagraphe: selected.codeParagraphe,
      libelle:        selected.libelleArticle,
      typeCredit:     selected.typeCredit,
      creditInitial:  data.creditInitial,
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

      {/* ─── Sélecteur nomenclature ─────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Article budgétaire <span className="text-red-500">*</span>
        </label>
        <div className="relative" data-nom-combo>
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Search size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); setSelected(null) }}
            onFocus={() => setShowDropdown(true)}
            placeholder={loadingNom ? 'Chargement…' : 'Chercher par code ou libellé…'}
            className={cn(
              'w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500',
              hasErr('nomenclatureId') ? 'border-red-400' : 'border-slate-300'
            )}
          />
          {showDropdown && filtered.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
              {filtered.slice(0, 50).map((nom) => (
                <li key={nom.id}>
                  <button
                    type="button"
                    onMouseDown={() => pickNomenclature(nom)}
                    className="w-full flex items-start gap-3 px-3 py-2 hover:bg-indigo-50 text-left"
                  >
                    <span className="font-mono text-xs text-indigo-600 shrink-0 pt-0.5 w-16">
                      {nom.codeArticle}
                    </span>
                    <div className="min-w-0">
                      <p className="text-slate-800 truncate">{nom.libelleArticle}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {nom.codeChapitre} · {nom.libelleChapitre} · {TYPE_CREDIT_LABELS[nom.typeCredit]}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {showDropdown && search.length > 0 && filtered.length === 0 && !loadingNom && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow">
              Aucun article trouvé pour « {search} »
            </div>
          )}
        </div>
        {/* champ caché pour react-hook-form */}
        <input type="hidden" {...register('nomenclatureId')} />
        {errMsg('nomenclatureId') !== null && (
          <p className="mt-1 text-xs text-red-600">{errMsg('nomenclatureId')}</p>
        )}
      </div>

      {/* ─── Récapitulatif nomenclature sélectionnée ─────────────────── */}
      {selected && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div className="flex gap-2">
              <span className="text-indigo-400 shrink-0">Titre</span>
              <span className="font-mono text-indigo-700">{selected.codeTitre}</span>
              <span className="text-slate-600 truncate">{selected.libelleTitre}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-400 shrink-0">Chapitre</span>
              <span className="font-mono text-indigo-700">{selected.codeChapitre}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-400 shrink-0">Article</span>
              <span className="font-mono text-indigo-700">{selected.codeArticle}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-indigo-400 shrink-0">Type</span>
              <span className="text-slate-700">{TYPE_CREDIT_LABELS[selected.typeCredit]}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Crédit initial ──────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Crédit initial (GNF) <span className="text-red-500">*</span>
        </label>
        <input
          {...register('creditInitial', { valueAsNumber: true })}
          type="number"
          min={0}
          step={1}
          className={inputCls(hasErr('creditInitial'))}
        />
        {errMsg('creditInitial') !== null && (
          <p className="mt-1 text-xs text-red-600">{errMsg('creditInitial')}</p>
        )}
      </div>

      {mutation.error != null && (
        <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending || !selected}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {(isSubmitting || mutation.isPending) && <Loader2 size={14} className="animate-spin" />}
          Créer la ligne
        </button>
      </div>
    </form>
  )
}
