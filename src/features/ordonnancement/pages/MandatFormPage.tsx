import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, FileText } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useLiquidationsValidees, useEmettreMandat } from '../hooks/useOrdonnancement'
import { MODES_PAIEMENT } from '../constants'

const schema = z.object({
  liquidationId:            z.string().min(1, 'Sélectionner une liquidation'),
  montant:                  z.coerce.number().int().positive('Montant obligatoire'),
  modePaiement:             z.enum(['VIREMENT', 'VIREMENT_BANCAIRE', 'CHEQUE', 'CHEQUE_TRESOR', 'CAISSE', 'MOBILE_MONEY']),
  beneficiaire:             z.string().min(2, 'Bénéficiaire obligatoire'),
  rib:                      z.string().optional(),
  banqueBeneficiaire:       z.string().optional(),
  numeroCompteBeneficiaire: z.string().optional(),
  observations:             z.string().max(1000).optional(),
})
type FormValues = z.infer<typeof schema>

export function MandatFormPage() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()
  const liquidationIdParam = searchParams.get('liquidationId') ?? ''

  const { data: liquidations = [], isLoading: loadLiq } = useLiquidationsValidees()
  const emettre = useEmettreMandat()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      liquidationId: liquidationIdParam,
      modePaiement:  'VIREMENT_BANCAIRE',
    },
  })

  const selectedLiqId  = watch('liquidationId')
  const modePaiement   = watch('modePaiement')
  const selectedLiq    = liquidations.find((l) => l.id === selectedLiqId)
  const showBankFields = ['VIREMENT', 'VIREMENT_BANCAIRE'].includes(modePaiement)

  // Pré-remplir montant et bénéficiaire quand liquidation sélectionnée
  useEffect(() => {
    if (selectedLiq) {
      setValue('montant', selectedLiq.montantNet)
      if (selectedLiq.engagement?.fournisseur) {
        setValue('beneficiaire', selectedLiq.engagement.fournisseur)
      }
    }
  }, [selectedLiqId, selectedLiq, setValue])

  function onSubmit(values: FormValues) {
    emettre.mutate(values, { onSuccess: () => navigate('/ordonnancement') })
  }

  return (
    <div>
      <PageHeader
        titre="Nouveau mandat de paiement"
        description="Ordonnancement d'une liquidation validée"
        actions={
          <button type="button" onClick={() => navigate('/ordonnancement')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Formulaire (2/3) ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Liquidation */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Liquidation à ordonnancer
              </h2>
              {loadLiq ? (
                <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <div>
                  <select {...register('liquidationId')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Sélectionner une liquidation validée —</option>
                    {liquidations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.numero} — {l.engagement?.objet ?? '?'} | {l.montantNet.toLocaleString('fr-GN')} GNF
                      </option>
                    ))}
                  </select>
                  {errors.liquidationId && (
                    <p className="mt-1 text-xs text-red-600">{errors.liquidationId.message}</p>
                  )}
                  {liquidations.length === 0 && !loadLiq && (
                    <p className="mt-1 text-xs text-amber-600">
                      Aucune liquidation validée disponible pour ordonnancement.
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Mode de paiement */}
            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Modalités de paiement
              </h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mode de paiement <span className="text-red-500">*</span>
                </label>
                <select {...register('modePaiement')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {MODES_PAIEMENT.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Bénéficiaire <span className="text-red-500">*</span>
                </label>
                <input type="text" {...register('beneficiaire')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nom du fournisseur / bénéficiaire" />
                {errors.beneficiaire && (
                  <p className="mt-1 text-xs text-red-600">{errors.beneficiaire.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Montant (GNF) <span className="text-red-500">*</span>
                </label>
                <input type="number" {...register('montant')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  readOnly={!!selectedLiq} />
                {errors.montant && (
                  <p className="mt-1 text-xs text-red-600">{errors.montant.message}</p>
                )}
              </div>

              {/* Coordonnées bancaires */}
              {showBankFields && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Banque bénéficiaire</label>
                    <input type="text" {...register('banqueBeneficiaire')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ex : BICIGUI, ECOBANK…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">N° compte / RIB</label>
                    <input type="text" {...register('rib')}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Numéro de compte local ou IBAN" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observations</label>
                <textarea {...register('observations')} rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Remarques éventuelles…" />
              </div>
            </section>
          </div>

          {/* ── Récapitulatif (1/3) ───────────────────────────────────── */}
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Récapitulatif</h3>

              {selectedLiq ? (
                <div className="space-y-3 text-sm">
                  {selectedLiq.engagement?.fournisseur && (
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Bénéficiaire</p>
                      <p className="font-medium text-slate-800">{selectedLiq.engagement.fournisseur}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Référence engagement</p>
                    <p className="font-mono text-xs text-indigo-600">
                      {selectedLiq.engagement?.numero ?? '—'}
                    </p>
                    <p className="text-slate-600 text-xs truncate">{selectedLiq.engagement?.objet ?? ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Référence liquidation</p>
                    <p className="font-mono text-xs text-indigo-600">{selectedLiq.numero}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span className="text-slate-600">Montant à payer</span>
                    <MontantGNF montant={selectedLiq.montantNet} taille="lg" couleur="success" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <FileText size={16} />
                  Sélectionnez une liquidation
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button type="submit" disabled={emettre.isPending}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                  {emettre.isPending ? 'Émission…' : 'Émettre le mandat'}
                </button>
                <button type="button" onClick={() => navigate('/ordonnancement')}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
