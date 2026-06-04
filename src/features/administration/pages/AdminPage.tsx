import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Building2, BookOpen, Shield, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { useTenant } from '@/app/contexts/TenantContext'
import { useAuth } from '@/app/contexts/AuthContext'

interface NavCard {
  icon: React.ElementType
  titre: string
  description: string
  path: string
  roles?: string[]
  couleur: string
  iconBg: string
}

const NAV_CARDS: NavCard[] = [
  {
    icon:        Users,
    titre:       'Utilisateurs',
    description: 'Gérer les comptes, rôles et accès',
    path:        '/administration/utilisateurs',
    couleur:     'border-indigo-100 hover:border-indigo-300',
    iconBg:      'bg-indigo-100 text-indigo-600',
  },
  {
    icon:        Calendar,
    titre:       'Exercices budgétaires',
    description: 'Créer, approuver et clôturer les exercices',
    path:        '/administration/exercices',
    couleur:     'border-amber-100 hover:border-amber-300',
    iconBg:      'bg-amber-100 text-amber-600',
  },
  {
    icon:        Building2,
    titre:       'Fournisseurs',
    description: 'Référentiel des fournisseurs du ministère',
    path:        '/administration/fournisseurs',
    couleur:     'border-teal-100 hover:border-teal-300',
    iconBg:      'bg-teal-100 text-teal-600',
  },
  {
    icon:        BookOpen,
    titre:       'Nomenclatures',
    description: 'Paramétrage des codes budgétaires',
    path:        '/administration/nomenclatures',
    roles:       ['SUPER_ADMIN'],
    couleur:     'border-purple-100 hover:border-purple-300',
    iconBg:      'bg-purple-100 text-purple-600',
  },
  {
    icon:        Shield,
    titre:       'Journal d\'audit',
    description: 'Traçabilité de toutes les opérations',
    path:        '/audit',
    couleur:     'border-slate-100 hover:border-slate-300',
    iconBg:      'bg-slate-100 text-slate-600',
  },
]

export function AdminPage() {
  const navigate = useNavigate()
  const { tenant } = useTenant()
  const { profil } = useAuth()
  const roles = profil?.roles ?? []

  const cardsVisibles = NAV_CARDS.filter(
    (c) => !c.roles || c.roles.some((r) => roles.includes(r as never))
  )

  return (
    <div>
      <PageHeader
        titre="Administration"
        description={tenant?.nom ?? 'Paramétrage du système'}
      />

      {/* Info tenant */}
      <div className="mb-6 rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div>
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Organisation</p>
            <p className="font-semibold text-indigo-900">{tenant?.nom ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Code</p>
            <p className="font-mono text-indigo-700">{tenant?.code ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Type</p>
            <p className="text-indigo-700">{tenant?.type ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Statut</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              tenant?.statut === 'ACTIF' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {tenant?.statut ?? '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Grille de cartes de navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cardsVisibles.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.path}
              type="button"
              onClick={() => navigate(card.path)}
              className={`group text-left bg-white border rounded-xl p-5 transition-all hover:shadow-md ${card.couleur}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  <Icon size={20} />
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1"
                />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{card.titre}</h3>
              <p className="text-xs text-slate-500">{card.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
