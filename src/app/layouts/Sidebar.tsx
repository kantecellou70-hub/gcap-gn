import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, FileText, ClipboardCheck, Send,
  TrendingUp, Package, BookOpen, BarChart2, Shield,
  Settings, LogOut, BarChart, FileDown, ChevronsUpDown, Landmark,
  Globe2, Building2,
} from 'lucide-react'
import { LogoGCAPGN } from '@/shared/components/LogoGCAPGN'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant, NATIONAL_TENANT_ID } from '@/app/contexts/TenantContext'
import { cn } from '@/shared/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  dataTour?: string
  tenantRequired?: boolean
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
      { label: 'Tableau de bord', path: '/tableau-de-bord', icon: LayoutDashboard, tenantRequired: true },
    ],
  },
  {
    titre: 'BUDGET & DÉPENSES',
    items: [
      { label: 'Budget',          path: '/budget',          icon: Wallet,         dataTour: 'nav-budget',         tenantRequired: true },
      { label: 'Engagements',     path: '/engagements',     icon: FileText,       dataTour: 'nav-engagements',    tenantRequired: true },
      { label: 'Liquidations',    path: '/liquidations',    icon: ClipboardCheck,                                 tenantRequired: true },
      { label: 'Ordonnancement',  path: '/ordonnancement',  icon: Send,           dataTour: 'nav-ordonnancement', tenantRequired: true },
    ],
  },
  {
    titre: 'AUTRES',
    items: [
      { label: 'Recettes', path: '/recettes', icon: TrendingUp, tenantRequired: true },
      { label: 'Matières', path: '/matieres', icon: Package,    tenantRequired: true },
    ],
  },
  {
    titre: 'RAPPORTS',
    items: [
      { label: 'Comptes admin', path: '/comptes-admin', icon: BookOpen, tenantRequired: true },
      { label: 'Reporting',     path: '/reporting',     icon: BarChart2,  dataTour: 'nav-reporting', tenantRequired: true },
      { label: 'Audit',         path: '/audit',         icon: Shield,     dataTour: 'nav-audit' },
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
    titre: 'VUE NATIONALE GCAP-GN',
    rolesRequis: ['SUPER_ADMIN'],
    items: [
      { label: 'Dashboard national',   path: '/super-admin/dashboard', icon: Globe2 },
      { label: 'Consolidation M9',     path: '/super-admin/m9',        icon: BarChart },
      { label: 'Export LOLF',          path: '/super-admin/lolf',      icon: FileDown },
      { label: 'Gestion ministères',   path: '/super-admin/tenants',   icon: Landmark },
    ],
  },
]

function NavItemLink({ item, disabled }: { item: NavItem; disabled?: boolean }) {
  const Icon = item.icon
  if (disabled) {
    return (
      <span
        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm opacity-40 pointer-events-none text-slate-400"
        aria-disabled="true"
        title="Non disponible en vue nationale — sélectionner un ministère"
      >
        <Icon size={16} aria-hidden="true" />
        {item.label}
      </span>
    )
  }
  return (
    <NavLink
      to={item.path}
      data-tour={item.dataTour}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )
      }
    >
      <Icon size={16} aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}

function UserInitials({ nom, prenom }: { nom: string; prenom: string }) {
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white shrink-0"
    >
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

function TenantDropdown() {
  const { tenantActif, tousLesTenants, switchTenant, isImpersonating, isNationalView } = useTenant()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const tenantLabel = isNationalView
    ? 'Vue nationale — GCAP-GN'
    : (tenantActif?.nom ?? '…')

  const TenantIcon = isNationalView ? Globe2 : Building2

  const activeTenantsInList = tousLesTenants.filter((t) => t.statut === 'ACTIF')

  return (
    <div className="mt-2 relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
        aria-label="Sélectionner un tenant"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer',
          !isNationalView && isImpersonating
            ? 'bg-blue-700 text-blue-100 border border-blue-500'
            : 'bg-slate-800 text-slate-300 border border-slate-700'
        )}
      >
        <TenantIcon size={12} aria-hidden="true" className="shrink-0" />
        <span className="flex-1 truncate text-left">{tenantLabel}</span>
        <ChevronsUpDown size={11} aria-hidden="true" className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Sélectionner un ministère ou la vue nationale"
          className="absolute left-0 top-full mt-1 w-full rounded-md border border-slate-700 bg-slate-800 shadow-lg z-50 max-h-52 overflow-y-auto"
        >
          {/* Vue nationale */}
          <button
            type="button"
            role="option"
            aria-selected={isNationalView ? 'true' : 'false'}
            onClick={() => { void switchTenant(NATIONAL_TENANT_ID); setOpen(false) }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-700',
              isNationalView ? 'text-indigo-400 font-semibold' : 'text-slate-300'
            )}
          >
            <Globe2 size={12} aria-hidden="true" className="shrink-0 text-indigo-400" />
            Vue nationale — GCAP-GN
          </button>

          {activeTenantsInList.length > 0 && (
            <div className="border-t border-slate-700" />
          )}

          {/* Ministères actifs */}
          {activeTenantsInList.map((t) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={tenantActif?.id === t.id && !isNationalView ? 'true' : 'false'}
              onClick={() => { void switchTenant(t.id); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-slate-700',
                tenantActif?.id === t.id && !isNationalView
                  ? 'text-white font-semibold'
                  : 'text-slate-300'
              )}
            >
              <Building2 size={12} aria-hidden="true" className="shrink-0 text-slate-500" />
              <span className="truncate">{t.nom}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const { profil, signOut } = useAuth()
  const { tenantActif, isNationalView } = useTenant()

  const roles = profil?.roles ?? []
  const primaryRole = roles[0] ?? ''
  const isSuperAdmin = roles.includes('SUPER_ADMIN')

  return (
    <aside
      className="w-56 shrink-0 bg-slate-900 flex flex-col h-screen"
      aria-label="Navigation principale"
    >
      {/* En-tête */}
      <div className="px-4 py-4 border-b border-slate-800">
        <LogoGCAPGN size="sm" variant="light" />

        {isSuperAdmin ? (
          <TenantDropdown />
        ) : (
          tenantActif && (
            <p className="mt-2 text-xs text-slate-500 truncate" title={tenantActif.nom}>
              {tenantActif.nom.length > 22 ? tenantActif.nom.slice(0, 20) + '…' : tenantActif.nom}
            </p>
          )
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Menu">
        {NAV_GROUPS.map((group) => {
          if (
            group.rolesRequis &&
            !group.rolesRequis.some((r) => roles.includes(r as never))
          ) {
            return null
          }
          return (
            <div key={group.titre} role="group" aria-label={group.titre}>
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-wider text-slate-600 uppercase" aria-hidden="true">
                {group.titre}
              </p>
              <ul className="space-y-0.5 list-none" role="list">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavItemLink
                      item={item}
                      disabled={isNationalView && !!item.tenantRequired}
                    />
                  </li>
                ))}
              </ul>
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
          type="button"
          onClick={signOut}
          aria-label="Se déconnecter de GCAP-GN"
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut size={16} aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
