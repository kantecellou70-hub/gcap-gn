import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, AlertTriangle, Minus } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useEngagementsVises, useCreerLiquidation } from '../hooks/useLiquidations'

// ─── Schéma de validation ───────────────────────────────────────────────────

const schema = z
  .object({
    engagementId:    z.string().uuid('Sélectionnez un engagement'),
    dateServiceFait: z.string().refine(
      (d) => d && new Date(d) <= new Date(),
      { message: 'La date ne peut pas être dans le futur' }
    ),
    referencePvsf:   z.string().min(3, 'Référence PVSF obligatoire (min 3 caractères)'),
    montantBrut:     z.coerce.number().int().positive('Montant obligatoire'),
    retenuSource:    z.coerce.number().int().min(0).default(0),
    penaliteRetard:  z.coerce.number().int().min(0).default(0),
    avanceRecuperee: z.coerce.number().int().min(0).default(0),
    dateFacture:     z.string().optional(),
    numeroFacture:   z.string().max(50).optional(),
    observations:    z.string().max(1000).optional(),
  })
  .refine(
    (d) => d.montantBrut - d.retenuSource - d.penaliteRetard - d.avanceRecuperee > 0,
    { message: 'Les déductions dépassent le montant brut — le montant net doit être positif', path: ['montantBrut'] }
  )

type FormValues = z.infer<typeof schema>

// ─── Composant champ montant ───────────────────────────────────────────────

function ChampMontant({
  label,
  name,
  register,
  error,
  placeholder = '0',
  required = false,
}: {
  label: string
  name: keyof FormValues
  register: ReturnType<typeof useForm<FormValues>>['register']
  error?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        <span className="ml-1 text-xs text-slate-400 font-normal">GNF</span>
      </label>
      <input
        type="number"
        min={0}
        {...register(name)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export function LiquidationFormPage() {
  const navigate = useNavigate()
  const { data: engagements = [], isLoading: loadingEng } = useEngagementsVises()
  const creer = useCreerLiquidation()
  const submitStatut = useRef<'BROUILLON' | 'SOUMISE'>('BROUILLON')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: { retenuSource: 0, penaliteRetard: 0, avanceRecuperee: 0 },
  })

  const selectedEngId  = watch('engagementId')
  const montantBrut    = watch('montantBrut')    ?? 0
  const retenuSource   = watch('retenuSource')   ?? 0
  const penaliteRetard = watch('penaliteRetard') ?? 0
  const avanceRec      = watch('avanceRecuperee') ?? 0
  const montantNet     = (montantBrut || 0) - (retenuSource || 0) - (penaliteRetard || 0) - (avanceRec || 0)

  const selectedEng = engagements.find((e) => e.id === selectedEngId)
  const depassement = selectedEng && montantBrut > selectedEng.resteALiquider

  function onSubmit(values: FormValues) {
    creer.mutate(
      {
        input: {
          engagementId:    values.engagementId,
          montantBrut:     values.montantBrut,
          retenuSource:    values.retenuSource ?? 0,
          penaliteRetard:  values.penaliteRetard ?? 0,
          avanceRecuperee: values.avanceRecuperee ?? 0,
          dateServiceFait: values.dateServiceFait,
          referencePvsf:   values.referencePvsf,
          dateFacture:     values.dateFacture,
          numeroFacture:   values.numeroFacture,
          observations:    values.observations,
        },
        statut: submitStatut.current,
      },
      { onSuccess: () => navigate('/liquidations') }
    )
  }

  function handleCancel() {
    if (isDirty && !confirm('Des modifications non enregistrées seront perdues. Continuer ?')) return
    navigate('/liquidations')
  }

  return (
    <div>
      <PageHeader
        titre="Nouvelle liquidation"
        description="Constatation du service fait et arrêté du montant exact à payer"
        actions={
          <button type="button" onClick={handleCancel}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne principale (2/3) ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Engagement */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Engagement à liquider
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Engagement visé <span className="text-red-500">*</span>
                </label>
                {loadingEng ? (
                  <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
                ) : (
                  <select
                    {...register('engagementId')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Sélectionner un engagement VISÉ —</option>
                    {engagements.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.numero} — {e.objet} | Reste : {e.resteALiquider.toLocaleString('fr-GN')} GNF
                      </option>
                    ))}
                  </select>
                )}
                {errors.engagementId && (
                  <p className="mt-1 text-xs text-red-600">{errors.engagementId.message}</p>
                )}
                {!loadingEng && engagements.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Aucun engagement visé avec du crédit disponible pour ce tenant.
                  </p>
                )}
              </div>

              {selectedEng && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-sm">
                  <p className="font-medium text-indigo-800">{selectedEng.objet}</p>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-indigo-600">
                    <span>Engagé : <strong>{selectedEng.montantEngage.toLocaleString('fr-GN')} GNF</strong></span>
                    {selectedEng.dejaLiquide > 0 && (
                      <span>Déjà liquidé : <strong>{selectedEng.dejaLiquide.toLocaleString('fr-GN')} GNF</strong></span>
                    )}
                    <span className="text-green-700 font-semibold">
                      Reste : {selectedEng.resteALiquider.toLocaleString('fr-GN')} GNF
                    </span>
                  </div>
                  {selectedEng.fournisseur && (
                    <p className="text-xs text-indigo-500 mt-0.5">Fournisseur : {selectedEng.fournisseur}</p>
                  )}
                </div>
              )}
            </section>

            {/* Service fait */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Constatation du service fait
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date du service fait <span className="text-red-500">*</span>
                  </label>
                  <input type="date" {...register('dateServiceFait')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {errors.dateServiceFait && (
                    <p className="mt-1 text-xs text-red-600">{errors.dateServiceFait.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Référence PV service fait <span className="text-red-500">*</span>
                  </label>
                  <input type="text" {...register('referencePvsf')}
                    placeholder="Ex : PV-MEFB-2026-001"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {errors.referencePvsf && (
                    <p className="mt-1 text-xs text-red-600">{errors.referencePvsf.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date facture
                  </label>
                  <input type="date" {...register('dateFacture')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    N° facture
                  </label>
                  <input type="text" {...register('numeroFacture')}
                    placeholder="Optionnel"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </section>

            {/* Montants */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Montants
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant brut <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs font-normal text-slate-400">GNF</span>
                </label>
                <input
                  type="number" min={1}
                  max={selectedEng?.resteALiquider}
                  {...register('montantBrut')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={selectedEng ? String(selectedEng.resteALiquider) : 'Ex : 5 000 000'}
                />
                {errors.montantBrut && (
                  <p className="mt-1 text-xs text-red-600">{errors.montantBrut.message}</p>
                )}
                {depassement && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600">
                    <AlertTriangle size={12} />
                    Dépassement : reste à liquider = {selectedEng!.resteALiquider.toLocaleString('fr-GN')} GNF
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ChampMontant label="Retenue à la source"  name="retenuSource"   register={register} />
                <ChampMontant label="Pénalités de retard" name="penaliteRetard" register={register} />
                <ChampMontant label="Avance récupérée"    name="avanceRecuperee" register={register} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observations
                </label>
                <textarea {...register('observations')} rows={2}
                  placeholder="Remarques éventuelles…"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </section>
          </div>

          {/* ── Colonne latérale (1/3) ───────────────────────────────── */}
          <div className="space-y-4">

            {/* Calcul automatique */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Calcul automatique</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant brut</span>
                  <MontantGNF montant={montantBrut || 0} taille="sm" />
                </div>
                {(retenuSource > 0 || penaliteRetard > 0 || avanceRec > 0) && (
                  <>
                    {retenuSource > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span className="flex items-center gap-1"><Minus size={10} />Retenue source</span>
                        <MontantGNF montant={retenuSource} taille="sm" couleur="muted" />
                      </div>
                    )}
                    {penaliteRetard > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span className="flex items-center gap-1"><Minus size={10} />Pénalités</span>
                        <MontantGNF montant={penaliteRetard} taille="sm" couleur="muted" />
                      </div>
                    )}
                    {avanceRec > 0 && (
                      <div className="flex justify-between text-slate-400">
                        <span className="flex items-center gap-1"><Minus size={10} />Avance récupérée</span>
                        <MontantGNF montant={avanceRec} taille="sm" couleur="muted" />
                      </div>
                    )}
                  </>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold">
                  <span className="text-slate-700">Montant NET</span>
                  <MontantGNF
                    montant={Math.max(0, montantNet)}
                    taille="md"
                    couleur={montantNet <= 0 ? 'danger' : 'success'}
                  />
                </div>
              </div>

              {montantNet <= 0 && montantBrut > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                  Les déductions dépassent le montant brut
                </div>
              )}
            </div>

            {/* Pièces jointes */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Pièces jointes</h3>
              <div className="space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2">
                  <span className="text-red-500">*</span> Facture (PDF/image)
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2">
                  <span className="text-red-500">*</span> PV de service fait
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-slate-400">
                  Autres documents (optionnel)
                </div>
                <p className="text-slate-400 text-xs">Upload Supabase Storage — Phase 2</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={creer.isPending}
                onClick={() => { submitStatut.current = 'SOUMISE' }}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {creer.isPending && submitStatut.current === 'SOUMISE' ? 'Soumission…' : 'Soumettre'}
              </button>
              <button
                type="submit"
                disabled={creer.isPending}
                onClick={() => { submitStatut.current = 'BROUILLON' }}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {creer.isPending && submitStatut.current === 'BROUILLON' ? 'Enregistrement…' : 'Enregistrer en brouillon'}
              </button>
              <button type="button" onClick={handleCancel}
                className="w-full rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
