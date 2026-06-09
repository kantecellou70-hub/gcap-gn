import { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { useCreerUtilisateurMinistere } from '../hooks/useCreerUtilisateur'
import type { TenantAvecStats } from '../api/tenantsAdmin-api'
import type { CreateMinistereUserPayload } from '../api/tenantsAdmin-api'

interface Props {
  tenant: TenantAvecStats
  onClose: () => void
}

type RoleOption = CreateMinistereUserPayload['role']

const ROLES_OPTIONS: { value: RoleOption; label: string }[] = [
  { value: 'ADMIN_MINISTERE', label: 'Administrateur du Ministère' },
  { value: 'DAFF',            label: 'Directeur Administratif et Financier (DAFF)' },
  { value: 'ORDONNATEUR',     label: 'Ordonnateur' },
  { value: 'CF',              label: 'Contrôleur Financier (CF)' },
]

const POSTES_SUGGERES = [
  'Directeur Administratif et Financier',
  'Chef DAFF',
  'Responsable Budget',
  'Contrôleur Financier',
  'Ordonnateur délégué',
  'Autre',
]

export function CreerUtilisateurMinistereModal({ tenant, onClose }: Props) {
  const mutation = useCreerUtilisateurMinistere()

  const [form, setForm] = useState<Omit<CreateMinistereUserPayload, 'tenant_id'>>({
    prenom: '',
    nom:    '',
    email:  '',
    poste:  '',
    role:   'ADMIN_MINISTERE',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.prenom.trim()) next.prenom = 'Le prénom est requis.'
    if (!form.nom.trim())    next.nom    = 'Le nom est requis.'
    if (!form.email.trim()) {
      next.email = 'L\'email est requis.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Adresse email invalide.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    await mutation.mutateAsync({
      ...form,
      tenant_id: tenant.id,
    })
    onClose()
  }

  function field(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Créer l'administrateur</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{tenant.nom}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.prenom}
                onChange={(e) => field('prenom', e.target.value)}
                placeholder="ex : Mamadou"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.prenom && <p className="mt-1 text-xs text-red-600">{errors.prenom}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => field('nom', e.target.value)}
                placeholder="ex : Diallo"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {errors.nom && <p className="mt-1 text-xs text-red-600">{errors.nom}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email professionnel <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => field('email', e.target.value)}
              placeholder="ex : m.diallo@justice.gov.gn"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          {/* Poste */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Poste</label>
            <select
              value={form.poste}
              onChange={(e) => field('poste', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              <option value="">— Sélectionner —</option>
              {POSTES_SUGGERES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Rôle initial */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rôle initial <span className="text-red-500">*</span>
            </label>
            <select
              value={form.role}
              onChange={(e) => field('role', e.target.value as RoleOption)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              {ROLES_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Info lien expiration */}
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            Un email d'invitation sera envoyé à l'adresse indiquée. Le lien de connexion est
            valable <strong>24 heures</strong>.
          </p>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              {mutation.isPending ? 'Envoi…' : 'Créer et envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
