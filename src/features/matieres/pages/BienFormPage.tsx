import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { SicomSyncBadge } from '../components/SicomSyncBadge'
import { useBien, useCreerBien, useModifierBien, useSyncBien } from '../hooks/useBiens'
import { CATEGORIES_OPTIONS, ETATS_OPTIONS } from '../constants'

const schema = z.object({
  designation:        z.string().min(3, 'Désignation trop courte (min 3 caractères)').max(255),
  categorie:          z.enum([
    'MOBILIER', 'INFORMATIQUE', 'VEHICULE',
    'EQUIPEMENT_BUREAU', 'MATERIEL_TECHNIQUE', 'IMMEUBLE', 'AUTRE',
  ]),
  marque:             z.string().max(100).optional(),
  modele:             z.string().max(100).optional(),
  numeroSerie:        z.string().max(100).optional(),
  valeurAcquisition:  z.coerce.number({ error: 'Valeur invalide' }).int().min(0, 'Valeur obligatoire'),
  dateAcquisition:    z.string().min(1, 'Date obligatoire'),
  localisation:       z.string().min(2, 'Localisation obligatoire').max(255),
  affecteA:           z.string().uuid().optional().or(z.literal('')),
  etat:               z.enum(['BON', 'ACCEPTABLE', 'MEDIOCRE', 'HORS_SERVICE', 'REFORME']).default('BON'),
  engagementId:       z.string().uuid().optional().or(z.literal('')),
  observations:       z.string().max(1000).optional(),
})

type FormValues = z.infer<typeof schema>

interface BienFormPageProps {
  mode?: 'create' | 'edit'
}

export function BienFormPage({ mode = 'create' }: BienFormPageProps) {
  const navigate    = useNavigate()
  const { id }      = useParams<{ id: string }>()
  const isEdit      = mode === 'edit' && !!id

  const { data: bien } = useBien(isEdit ? id! : '')
  const creer          = useCreerBien()
  const modifier       = useModifierBien()
  const syncBien       = useSyncBien()

  const isPending = creer.isPending || modifier.isPending

  const { register, handleSubmit, reset, formState: { errors, isDirty } } =
    useForm<FormValues>({
      resolver: zodResolver(schema) as Resolver<FormValues>,
      defaultValues: { etat: 'BON' },
    })

  useEffect(() => {
    if (bien && isEdit) {
      reset({
        designation:       bien.designation,
        categorie:         bien.categorie,
        marque:            bien.marque ?? '',
        modele:            bien.modele ?? '',
        numeroSerie:       bien.numeroSerie ?? '',
        valeurAcquisition: bien.valeurAcquisition,
        dateAcquisition:   bien.dateAcquisition,
        localisation:      bien.localisation,
        affecteA:          bien.affecteA ?? '',
        etat:              bien.etat,
        engagementId:      bien.engagementId ?? '',
        observations:      bien.observations ?? '',
      })
    }
  }, [bien, isEdit, reset])

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      marque:       values.marque || undefined,
      modele:       values.modele || undefined,
      numeroSerie:  values.numeroSerie || undefined,
      affecteA:     values.affecteA || undefined,
      engagementId: values.engagementId || undefined,
      observations: values.observations || undefined,
    }

    if (isEdit) {
      modifier.mutate(
        { id: id!, input: payload },
        { onSuccess: () => navigate(`/matieres/${id}`) }
      )
    } else {
      creer.mutate(payload, { onSuccess: () => navigate('/matieres') })
    }
  }

  function handleCancel() {
    if (isDirty && !confirm('Des modifications non enregistrées seront perdues. Continuer ?')) return
    navigate(isEdit ? `/matieres/${id}` : '/matieres')
  }

  const titre = isEdit ? 'Modifier le bien' : 'Enregistrer un nouveau bien'

  return (
    <div>
      <PageHeader
        titre={titre}
        description="Inventaire des biens de l'État guinéen"
        actions={
          <button type="button" onClick={handleCancel}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Retour
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        {/* ─── Formulaire principal (2/3) ─────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-5">

          {/* Désignation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Désignation <span className="text-red-500">*</span>
            </label>
            <input type="text" {...register('designation')}
              placeholder="Ex : Ordinateur portable Dell Latitude"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.designation && (
              <p className="mt-1 text-xs text-red-600">{errors.designation.message}</p>
            )}
          </div>

          {/* Catégorie + État */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catégorie <span className="text-red-500">*</span>
              </label>
              <select {...register('categorie')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {CATEGORIES_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                État <span className="text-red-500">*</span>
              </label>
              <select {...register('etat')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {ETATS_OPTIONS.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Marque + Modèle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Marque</label>
              <input type="text" {...register('marque')} placeholder="Ex : Dell, Toyota…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modèle</label>
              <input type="text" {...register('modele')} placeholder="Ex : Latitude 5520"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Numéro de série */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de série</label>
            <input type="text" {...register('numeroSerie')}
              placeholder="Numéro de série ou plaque d'immatriculation"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Date acquisition + Valeur */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date d'acquisition <span className="text-red-500">*</span>
              </label>
              <input type="date" {...register('dateAcquisition')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.dateAcquisition && (
                <p className="mt-1 text-xs text-red-600">{errors.dateAcquisition.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valeur d'acquisition (GNF) <span className="text-red-500">*</span>
              </label>
              <input type="number" min={0} {...register('valeurAcquisition')}
                placeholder="Ex : 25 000 000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              {errors.valeurAcquisition && (
                <p className="mt-1 text-xs text-red-600">{errors.valeurAcquisition.message}</p>
              )}
            </div>
          </div>

          {/* Localisation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Localisation <span className="text-red-500">*</span>
            </label>
            <input type="text" {...register('localisation')}
              placeholder="Ex : Bureau 201, Bâtiment A"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {errors.localisation && (
              <p className="mt-1 text-xs text-red-600">{errors.localisation.message}</p>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observations</label>
            <textarea {...register('observations')} rows={3}
              placeholder="Remarques, historique, références…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleCancel}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {isPending
                ? 'Enregistrement…'
                : isEdit ? 'Enregistrer les modifications' : 'Créer le bien'
              }
            </button>
          </div>
        </form>

        {/* ─── Panneau latéral (1/3) ───────────────────────────────────── */}
        <div className="space-y-4">
          {isEdit && bien && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Synchronisation SICOM</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Statut</span>
                  <SicomSyncBadge sicomId={bien.sicomId} sicomSyncAt={bien.sicomSyncAt} />
                </div>
                {bien.sicomId && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">SICOM ID</span>
                    <span className="font-mono text-xs text-slate-700">{bien.sicomId}</span>
                  </div>
                )}
                {bien.sicomSyncAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dernière sync</span>
                    <span className="text-slate-700">
                      {new Intl.DateTimeFormat('fr-GN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }).format(new Date(bien.sicomSyncAt))}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => syncBien.mutate(bien.id)}
                  disabled={syncBien.isPending}
                  className="w-full rounded-lg border border-teal-300 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                >
                  {syncBien.isPending ? 'Synchronisation…' : 'Synchroniser ce bien'}
                </button>
              </div>
            </div>
          )}

          {!isEdit && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">Code inventaire</p>
              <p>Le code sera généré automatiquement au format <span className="font-mono">INV-AAAA-CODE-XXXXXX</span>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
