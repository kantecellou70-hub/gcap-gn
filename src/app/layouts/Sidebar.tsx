import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, FileText, ClipboardCheck, Send,
  TrendingUp, Package, BookOpen, BarChart2, Shield,
  Settings, LogOut, Building2, BarChart, FileDown, ChevronsUpDown,
} from 'lucide-react'
import { LogoGCAPGN } from '@/shared/components/LogoGCAPGN'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import { cn } from '@/shared/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
}

interface NavGroup {
  titre: string
  items: NavItem[]
  rolesRequis?: string[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    titre: 'PRINCIPAL',
    items: [
      { label: 'Tableau de bord', path: '/tableau-de-bord', icon: LayoutDashboard },
    ],
  },
  {
    titre: 'BUDGET & DÉPENSES',
    items: [
      { label: 'Budget',          path: '/budget',          icon: Wallet },
      { label: 'Engagements',     path: '/engagements',     icon: FileText },
      { label: 'Liquidations',    path: '/liquidations',    icon: ClipboardCheck },
      { label: 'Ordonnancement',  path: '/ordonnancement',  icon: Send },
    ],
  },
  {
    titre: 'AUTRES',
    items: [
      { label: 'Recettes', path: '/recettes', icon: TrendingUp },
      { label: 'Matières', path: '/matieres', icon: Package },
    ],
  },
  {
    titre: 'RAPPORTS',
    items: [
      { label: 'Comptes admin', path: '/comptes-admin', icon: BookOpen },
      { label: 'Reporting',     path: '/reporting',     icon: BarChart2 },
      { label: 'Audit',         path: '/audit',         icon: Shield },
    ],
  },
  {
    titre: 'ADMINISTRATION',
    rolesRequis: ['SUPER_ADMIN', 'ADMIN_MINISTERE'],
    items: [
      { label: 'Administration', path: '/administration', icon: Settings },
    ],
  },
  {
    titre: 'VUE NATIONALE MEFB',
    rolesRequis: ['SUPER_ADMIN'],
    items: [
      { label: 'Dashboard national',   path: '/super-admin/dashboard', icon: Building2 },
      { label: 'Consolidation M9',     path: '/super-admin/m9',        icon: BarChart },
      { label: 'Export LOLF',          path: '/super-admin/lolf',      icon: FileDown },
    ],
  },
]

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )
      }
    >
      <Icon size={16} />
      {item.label}
    </NavLink>
  )
}

function UserInitials({ nom, prenom }: { nom: string; prenom: string }) {
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white shrink-0">
      {initials}
    </span>
  )
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:        'Super Admin',
  ADMIN_MINISTERE:    'Administrateur',
  ORDONNATEUR:        'Ordonnateur',
  DAFF:               'Gest. Crédits',
  SAFF:               'Agent SAFF',
  CF:                 'Contr. Financier',
  COMPTABLE_MATIERES: 'Compt. Matières',
  AUDITEUR:           'Auditeur',
  GESTIONNAIRE_BUDGET:'Gest. Budget',
}

export function Sidebar() {
  const { profil, signOut } = useAuth()
  const { tenantActif, tousLesTenants, switchTenant, resetTenant, isImpersonating } = useTenant()

  const roles = profil?.roles ?? []
  const primaryRole = roles[0] ?? ''
  const isSuperAdmin = roles.includes('SUPER_ADMIN')

  async function handleTenantChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val === '__origine__') {
      resetTenant()
    } else {
      await switchTenant(val)
    }
  }

  return (
    <aside className="w-56 shrink-0 bg-slate-900 flex flex-col h-screen">
      {/* En-tête */}
      <div className="px-4 py-4 border-b border-slate-800">
        <LogoGCAPGN size="sm" variant="light" />

        {/* Dropdown tenant SUPER_ADMIN */}
        {isSuperAdmin ? (
          <div className="mt-2 relative">
            <select
              aria-label="Sélectionner un tenant"
              value={tenantActif?.id ?? ''}
              onChange={handleTenantChange}
              className={cn(
                'w-full appearance-none rounded-md px-2 py-1.5 pr-7 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer',
                isImpersonating
                  ? 'bg-blue-700 text-blue-100 border border-blue-500'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              )}
            >
              <option value="__origine__">Vue nationale MEFB</option>
              {tousLesTenants.map((t) => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
            <ChevronsUpDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        ) : (
          tenantActif && (
            <p className="mt-2 text-xs text-slate-500 truncate" title={tenantActif.nom}>
              {tenantActif.nom.length > 22 ? tenantActif.nom.slice(0, 20) + '…' : tenantActif.nom}
            </p>
          )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => {
          if (
            group.rolesRequis &&
            !group.rolesRequis.some((r) => roles.includes(r as never))
          ) {
            return null
          }
          return (
            <div key={group.titre}>
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-wider text-slate-600 uppercase">
                {group.titre}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItemLink key={item.path} item={item} />
                ))}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Pied de sidebar */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          {profil && (
            <UserInitials nom={profil.nom} prenom={profil.prenom} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">
              {profil ? `${profil.prenom} ${profil.nom}` : '—'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {ROLE_LABELS[primaryRole] ?? primaryRole}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
