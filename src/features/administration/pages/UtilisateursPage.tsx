import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, UserPlus, UserCircle, Copy, CheckCircle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { formatDate } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  useUtilisateurs, useInviterUtilisateur, useModifierRole,
  useDesactiverUtilisateur, useReactiverUtilisateur,
} from '../hooks/useAdministration'
import type { UtilisateurAvecRoles, Role } from '../types'

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN:        'Super Admin',
  ADMIN_MINISTERE:    'Admin Ministère',
  ORDONNATEUR:        'Ordonnateur',
  DAFF:               'DAFF',
  SAFF:               'SAFF',
  CF:                 'Contrôleur Financier',
  COMPTABLE_MATIERES: 'Comptable Matières',
  AUDITEUR:           'Auditeur',
  GESTIONNAIRE_BUDGET:'Gestionnaire Budget',
}

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN:        'bg-purple-100 text-purple-700',
  ADMIN_MINISTERE:    'bg-indigo-100 text-indigo-700',
  ORDONNATEUR:        'bg-blue-100 text-blue-700',
  DAFF:               'bg-teal-100 text-teal-700',
  SAFF:               'bg-cyan-100 text-cyan-700',
  CF:                 'bg-amber-100 text-amber-700',
  COMPTABLE_MATIERES: 'bg-green-100 text-green-700',
  AUDITEUR:           'bg-slate-100 text-slate-600',
  GESTIONNAIRE_BUDGET:'bg-rose-100 text-rose-700',
}

// Rôles assignables par ADMIN_MINISTERE (tous sauf SUPER_ADMIN)
const ROLES_ASSIGNABLES: Role[] = [
  'ORDONNATEUR', 'DAFF', 'SAFF', 'CF',
  'COMPTABLE_MATIERES', 'AUDITEUR', 'GESTIONNAIRE_BUDGET',
]

function genererMDP(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const inviteSchema = z.object({
  email:       z.string().email('Email invalide'),
  nom:         z.string().min(2, 'Nom obligatoire'),
  prenom:      z.string().min(2, 'Prénom obligatoire'),
  poste:       z.string().optional(),
  role:        z.enum(['ORDONNATEUR','DAFF','SAFF','CF','COMPTABLE_MATIERES','AUDITEUR','GESTIONNAIRE_BUDGET']),
  motDePasse:  z.string().min(8, 'Mot de passe trop court'),
})
type InviteFormValues = z.infer<typeof inviteSchema>

export function UtilisateursPage() {
  const navigate   = useNavigate()
  const { profil } = useAuth()

  const { data: utilisateurs = [], isLoading } = useUtilisateurs()
  const inviter    = useInviterUtilisateur()
  const changerRole= useModifierRole()
  const desactiver = useDesactiverUtilisateur()
  const reactiver  = useReactiverUtilisateur()

  const [showInvite, setShowInvite]     = useState(false)
  const [credentiels, setCredentiels]   = useState<{ email: string; mdp: string } | null>(null)
  const [copied, setCopied]             = useState(false)
  const [confirmDesa, setConfirmDesa]   = useState<UtilisateurAvecRoles | null>(null)
  const [roleDialog, setRoleDialog]     = useState<UtilisateurAvecRoles | null>(null)
  const [nouveauRole, setNouveauRole]   = useState<Role>('DAFF')

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { motDePasse: genererMDP(), role: 'DAFF' },
  })

  watch('motDePasse')

  function onInviteSubmit(values: InviteFormValues) {
    // Contrainte : ADMIN_MINISTERE ne peut pas assigner SUPER_ADMIN ou ADMIN_MINISTERE
    if (!profil?.roles.includes('SUPER_ADMIN') && ['SUPER_ADMIN', 'ADMIN_MINISTERE'].includes(values.role)) {
      return
    }
    inviter.mutate(values, {
      onSuccess: () => {
        setCredentiels({ email: values.email, mdp: values.motDePasse })
        setShowInvite(false)
        reset()
      },
    })
  }

  function copyMDP() {
    if (credentiels) {
      navigator.clipboard.writeText(credentiels.mdp)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const colonnes: ColonneDef<UtilisateurAvecRoles>[] = [
    {
      key: 'identite',
      header: 'Utilisateur',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            u.actif ? 'bg-indigo-100' : 'bg-slate-100'
          )}>
            <UserCircle size={16} className={u.actif ? 'text-indigo-600' : 'text-slate-400'} />
          </div>
          <div>
            <p className={cn('text-sm font-medium', u.actif ? 'text-slate-800' : 'text-slate-400')}>
              {u.prenom} {u.nom}
            </p>
            {u.poste && <p className="text-xs text-slate-400">{u.poste}</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'matricule',
      header: 'Matricule',
      render: (u) => <span className="font-mono text-xs text-slate-500">{u.matricule ?? '—'}</span>,
    },
    {
      key: 'roles',
      header: 'Rôles',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.rolesDetail.filter((r) => r.actif).map((r) => (
            <span key={r.role}
              className={cn('rounded-full px-2 py-0.5 text-xs font-medium', ROLE_COLORS[r.role] ?? 'bg-slate-100 text-slate-600')}>
              {ROLE_LABELS[r.role] ?? r.role}
            </span>
          ))}
          {u.rolesDetail.filter((r) => r.actif).length === 0 && (
            <span className="text-xs text-slate-400">Aucun rôle actif</span>
          )}
        </div>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      render: (u) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium',
          u.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500')}>
          {u.actif ? 'Actif' : 'Inactif'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Depuis',
      render: (u) => <span className="text-xs text-slate-400">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (u) => {
        const isSelf = profil?.id === u.id
        if (isSelf) return <span className="text-xs text-slate-300">Vous</span>
        return (
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={(e) => { e.stopPropagation(); setNouveauRole(u.rolesDetail.find((r) => r.actif)?.role ?? 'DAFF'); setRoleDialog(u) }}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
              Rôle
            </button>
            {u.actif ? (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDesa(u) }}
                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                Désactiver
              </button>
            ) : (
              <button type="button"
                onClick={(e) => { e.stopPropagation(); reactiver.mutate(u.id) }}
                className="rounded-md border border-green-200 px-2 py-1 text-xs text-green-600 hover:bg-green-50">
                Réactiver
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Utilisateurs"
        description={`${utilisateurs.length} utilisateur${utilisateurs.length > 1 ? 's' : ''}`}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <UserPlus size={16} /> Inviter un utilisateur
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
        donnees={utilisateurs}
        isLoading={isLoading}
        getRowKey={(u) => u.id}
      />

      {/* ─── Dialog invitation ────────────────────────────────────── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowInvite(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5">Inviter un utilisateur</h2>
            <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom *</label>
                  <input type="text" {...register('prenom')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {errors.prenom && <p className="mt-0.5 text-xs text-red-600">{errors.prenom.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <input type="text" {...register('nom')}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {errors.nom && <p className="mt-0.5 text-xs text-red-600">{errors.nom.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input type="email" {...register('email')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                {errors.email && <p className="mt-0.5 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Poste</label>
                <input type="text" {...register('poste')} placeholder="Ex : Responsable budgétaire"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rôle *</label>
                <select {...register('role')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  {ROLES_ASSIGNABLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe temporaire *
                </label>
                <div className="flex gap-2">
                  <input type="text" {...register('motDePasse')}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono" />
                  <button type="button"
                    onClick={() => setValue('motDePasse', genererMDP())}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                    Régénérer
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Communiquez ce mot de passe à l'utilisateur. Il pourra le modifier à sa prochaine connexion.
                </p>
                {errors.motDePasse && <p className="mt-0.5 text-xs text-red-600">{errors.motDePasse.message}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                  Annuler
                </button>
                <button type="submit" disabled={inviter.isPending}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                  {inviter.isPending ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Dialog credentials créées ───────────────────────────── */}
      {credentiels && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Compte créé</h2>
                <p className="text-sm text-slate-500">Communiquez ces informations à l'utilisateur</p>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="font-medium">{credentiels.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Mot de passe temp.</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{credentiels.mdp}</span>
                  <button type="button" onClick={copyMDP}
                    className="text-slate-400 hover:text-slate-600">
                    {copied ? <CheckCircle size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-600">
              ⚠ Ce mot de passe ne sera plus affiché. Copiez-le avant de fermer.
            </p>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setCredentiels(null)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                J'ai copié le mot de passe
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Dialog modification rôle ─────────────────────────────── */}
      {roleDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRoleDialog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Modifier le rôle de {roleDialog.prenom} {roleDialog.nom}
            </h2>
            <select
              aria-label="Sélectionner un rôle"
              value={nouveauRole}
              onChange={(e) => setNouveauRole(e.target.value as Role)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-4"
            >
              {ROLES_ASSIGNABLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRoleDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
                Annuler
              </button>
              <button type="button"
                disabled={changerRole.isPending}
                onClick={() => changerRole.mutate(
                  { userId: roleDialog.id, role: nouveauRole },
                  { onSuccess: () => setRoleDialog(null) }
                )}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {changerRole.isPending ? 'Mise à jour…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Confirmation désactivation ───────────────────────────── */}
      <ConfirmDialog
        ouvert={!!confirmDesa}
        titre="Désactiver l'utilisateur"
        description={confirmDesa ? `Désactiver le compte de ${confirmDesa.prenom} ${confirmDesa.nom} ? L'utilisateur ne pourra plus se connecter.` : ''}
        onConfirm={() => {
          if (confirmDesa) desactiver.mutate(confirmDesa.id)
          setConfirmDesa(null)
        }}
        onCancel={() => setConfirmDesa(null)}
        variant="warning"
        labelConfirm="Désactiver"
      />
    </div>
  )
}
