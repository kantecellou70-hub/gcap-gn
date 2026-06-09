import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, UserPlus, ArrowRight, Building2, Users } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { cn } from '@/shared/lib/utils'
import { useTenant } from '@/app/contexts/TenantContext'
import { useTenantsAvecStats } from '../hooks/useCreerUtilisateur'
import { CreerUtilisateurMinistereModal } from '../components/CreerUtilisateurMinistereModal'
import type { TenantAvecStats } from '../api/tenantsAdmin-api'

function StatutBadge({ statut }: { statut: TenantAvecStats['statut_onboarding'] }) {
  if (statut === 'actif') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Actif
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Non activé
    </span>
  )
}

function TenantRow({
  tenant,
  onAdd,
  onView,
}: {
  tenant: TenantAvecStats
  onAdd: () => void
  onView: () => void
}) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
            <Building2 size={14} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800 leading-tight">{tenant.nom}</p>
            <p className="text-xs text-slate-400">{tenant.type}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
          {tenant.code}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Users size={13} className="text-slate-400" />
          {tenant.nb_utilisateurs === 0
            ? <span className="text-slate-400">Aucun</span>
            : <span>{tenant.nb_utilisateurs} utilisateur{tenant.nb_utilisateurs > 1 ? 's' : ''}</span>
          }
        </div>
      </td>
      <td className="px-4 py-3">
        <StatutBadge statut={tenant.statut_onboarding} />
      </td>
      <td className="px-4 py-3 text-right">
        {tenant.nb_utilisateurs === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            title="Créer le premier utilisateur"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <UserPlus size={13} />
            Activer
          </button>
        ) : (
          <button
            type="button"
            onClick={onView}
            title="Voir les utilisateurs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowRight size={13} />
            Gérer
          </button>
        )}
      </td>
    </tr>
  )
}

export function GestionTenantsPage() {
  const { data: tenants, isLoading, error } = useTenantsAvecStats()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<TenantAvecStats | null>(null)
  const { switchTenant } = useTenant()
  const navigate = useNavigate()

  async function handleGerer(tenant: TenantAvecStats) {
    await switchTenant(tenant.id)
    navigate('/administration/utilisateurs')
  }

  const filtered = (tenants ?? []).filter((t) =>
    t.nom.toLowerCase().includes(search.toLowerCase()) ||
    t.code.toLowerCase().includes(search.toLowerCase())
  )

  const nbActifs    = (tenants ?? []).filter((t) => t.statut_onboarding === 'actif').length
  const nbTotal     = (tenants ?? []).length
  const nbNonActifs = nbTotal - nbActifs

  return (
    <div>
      <PageHeader
        titre="Gestion des ministères"
        description={`${nbTotal} organisation${nbTotal > 1 ? 's' : ''} enregistrée${nbTotal > 1 ? 's' : ''}`}
      />

      {/* Résumé */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-100 bg-white px-5 py-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{nbTotal}</p>
        </div>
        <div className="rounded-xl border border-green-100 bg-green-50 px-5 py-4">
          <p className="text-xs font-medium text-green-600 uppercase tracking-wide">Actifs</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{nbActifs}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Non activés</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{nbNonActifs}</p>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-4 relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un ministère ou un code…"
          className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-500">
            Erreur de chargement. Veuillez réessayer.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {search ? 'Aucun résultat pour cette recherche.' : 'Aucun ministère enregistré.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Ministère / Organisation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Utilisateurs
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  onAdd={() => setSelected(tenant)}
                  onView={() => handleGerer(tenant)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Légende des statuts */}
      <div className={cn('mt-4 flex items-center gap-6 text-xs text-slate-400')}>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Actif — au moins un compte utilisateur
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Non activé — aucun compte créé
        </span>
      </div>

      {/* Modal création utilisateur */}
      {selected && (
        <CreerUtilisateurMinistereModal
          tenant={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
