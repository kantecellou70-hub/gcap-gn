import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Pencil } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { cn } from '@/shared/lib/utils'
import { useFournisseurs, useCreerFournisseur, useModifierFournisseur } from '../hooks/useAdministration'
import type { Fournisseur, FournisseurInput } from '../types'

const schema = z.object({
  code:          z.string().min(1, 'Code obligatoire').max(20),
  denomination:  z.string().min(2, 'Dénomination obligatoire').max(255),
  nif:           z.string().max(50).optional(),
  rccm:          z.string().max(50).optional(),
  telephone:     z.string().max(20).optional(),
  email:         z.string().email('Email invalide').optional().or(z.literal('')),
  adresse:       z.string().max(500).optional(),
  banque:        z.string().max(200).optional(),
  numeroCompte:  z.string().max(100).optional(),
  actif:         z.boolean().default(true),
})
type FormValues = z.infer<typeof schema>

function FournisseurDialog({
  initial,
  onClose,
  onSave,
  isPending,
}: {
  initial?: Fournisseur
  onClose: () => void
  onSave: (v: FournisseurInput) => void
  isPending: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: initial
      ? {
          code: initial.code, denomination: initial.denomination, nif: initial.nif ?? '',
          rccm: initial.rccm ?? '', telephone: initial.telephone ?? '', email: initial.email ?? '',
          adresse: initial.adresse ?? '', banque: initial.banque ?? '',
          numeroCompte: initial.numeroCompte ?? '', actif: initial.actif,
        }
      : { actif: true },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-slate-900 mb-5">
          {initial ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}
        </h2>
        <form onSubmit={handleSubmit((v) => onSave(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code * <span className="text-xs text-slate-400">(unique)</span></label>
              <input type="text" {...register('code')} placeholder="Ex : FOUR-001"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" />
              {errors.code && <p className="mt-0.5 text-xs text-red-600">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dénomination *</label>
              <input type="text" {...register('denomination')} placeholder="Raison sociale"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {errors.denomination && <p className="mt-0.5 text-xs text-red-600">{errors.denomination.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">NIF <span className="text-xs text-slate-400">(ID Fiscale Guinée)</span></label>
              <input type="text" {...register('nif')} placeholder="Ex : GN-001234567"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RCCM <span className="text-xs text-slate-400">(Registre Commerce)</span></label>
              <input type="text" {...register('rccm')} placeholder="Ex : GN/CKY/001234"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
              <input type="tel" {...register('telephone')} placeholder="+224 6XX XX XX XX"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" {...register('email')} placeholder="contact@fournisseur.gn"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {errors.email && <p className="mt-0.5 text-xs text-red-600">{errors.email.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse</label>
            <textarea {...register('adresse')} rows={2} placeholder="Adresse complète"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Banque</label>
              <input type="text" {...register('banque')} placeholder="Ex : BICIGUI, ECOBANK"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">N° Compte</label>
              <input type="text" {...register('numeroCompte')} placeholder="IBAN ou compte local"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="actif" {...register('actif')}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600" />
            <label htmlFor="actif" className="text-sm text-slate-700">Fournisseur actif</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Annuler</button>
            <button type="submit" disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? 'Enregistrement…' : initial ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FournisseursPage() {
  const navigate                          = useNavigate()
  const { data: fournisseurs = [], isLoading } = useFournisseurs()
  const creer                             = useCreerFournisseur()
  const modifier                          = useModifierFournisseur()

  const [showCreate, setShowCreate]  = useState(false)
  const [editing, setEditing]        = useState<Fournisseur | null>(null)

  function handleSaveNew(input: FournisseurInput) {
    creer.mutate(input, { onSuccess: () => setShowCreate(false) })
  }
  function handleSaveEdit(input: FournisseurInput) {
    if (!editing) return
    modifier.mutate({ id: editing.id, input }, { onSuccess: () => setEditing(null) })
  }

  const colonnes: ColonneDef<Fournisseur>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (f) => <span className="font-mono text-xs text-indigo-600 font-medium">{f.code}</span>,
    },
    {
      key: 'denomination',
      header: 'Dénomination',
      render: (f) => <span className="text-sm font-medium text-slate-800">{f.denomination}</span>,
    },
    {
      key: 'nif',
      header: 'NIF',
      render: (f) => <span className="font-mono text-xs text-slate-500">{f.nif ?? '—'}</span>,
    },
    {
      key: 'rccm',
      header: 'RCCM',
      render: (f) => <span className="font-mono text-xs text-slate-500">{f.rccm ?? '—'}</span>,
    },
    {
      key: 'telephone',
      header: 'Téléphone',
      render: (f) => <span className="text-sm text-slate-600">{f.telephone ?? '—'}</span>,
    },
    {
      key: 'actif',
      header: 'Statut',
      render: (f) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium',
          f.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
          {f.actif ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (f) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); setEditing(f) }}
          className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
          <Pencil size={11} /> Modifier
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Fournisseurs"
        description={`${fournisseurs.length} fournisseur${fournisseurs.length > 1 ? 's' : ''} enregistré${fournisseurs.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus size={16} /> Nouveau fournisseur
            </button>
            <button type="button" onClick={() => navigate('/administration')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ArrowLeft size={16} /> Administration
            </button>
          </div>
        }
      />

      <DataTable
        colonnes={colonnes}
        donnees={fournisseurs}
        isLoading={isLoading}
        getRowKey={(f) => f.id}
      />

      {showCreate && (
        <FournisseurDialog
          onClose={() => setShowCreate(false)}
          onSave={handleSaveNew}
          isPending={creer.isPending}
        />
      )}
      {editing && (
        <FournisseurDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={handleSaveEdit}
          isPending={modifier.isPending}
        />
      )}
    </div>
  )
}
