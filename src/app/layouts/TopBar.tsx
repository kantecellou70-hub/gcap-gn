import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, User, LogOut, PlayCircle, Download } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { PwaInstallPrompt } from '@/shared/components/PwaInstallPrompt'
import { useOnboarding } from '@/features/onboarding/hooks/useOnboarding'
import { genererManuelPdf } from '@/features/onboarding/lib/manuelPdf'

const BREADCRUMB_MAP: Record<string, string> = {
  '/tableau-de-bord': 'Tableau de bord',
  '/budget': 'Budget',
  '/engagements': 'Engagements',
  '/engagements/nouveau': 'Nouvel engagement',
  '/visa-cf': 'Visa Contrôleur Financier',
  '/liquidations': 'Liquidations',
  '/liquidations/nouveau': 'Nouvelle liquidation',
  '/ordonnancement': 'Ordonnancement',
  '/recettes': 'Recettes',
  '/matieres': 'Comptabilité Matières',
  '/comptes-admin': 'Comptes Administratifs',
  '/reporting': 'Reporting',
  '/audit': 'Journal d\'Audit',
  '/administration': 'Administration',
  '/administration/utilisateurs': 'Gestion des utilisateurs',
  '/notifications': 'Notifications',
  '/health': 'Health Check',
}

interface UserDropdownProps {
  onStartTour: () => void
}

function UserDropdown({ onStartTour }: UserDropdownProps) {
  const { profil, signOut } = useAuth()
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = profil
    ? `${profil.prenom.charAt(0)}${profil.nom.charAt(0)}`.toUpperCase()
    : '?'

  async function handleDownloadManuel() {
    if (!profil) return
    setOpen(false)
    setDownloadingPdf(true)
    const toastId = toast.loading('Manuel en cours de génération…')
    try {
      const role = profil.roles?.[0] ?? 'DAFF'
      const userName = `${profil.prenom} ${profil.nom}`
      const ministereNom = tenant?.nom ?? 'GCAP-GN'
      await genererManuelPdf(role, userName, ministereNom)
      toast.success('Manuel téléchargé !', { id: toastId })
    } catch {
      toast.error('Erreur lors de la génération du PDF.', { id: toastId })
    } finally {
      setDownloadingPdf(false)
    }
  }

  function handleStartTour() {
    setOpen(false)
    onStartTour()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Menu utilisateur"
        aria-expanded={open ? 'true' : 'false'}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
          {initials}
        </span>
        <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Options utilisateur"
          className="absolute right-0 top-10 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50"
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-800 truncate">
              {profil ? `${profil.prenom} ${profil.nom}` : '—'}
            </p>
          </div>
          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); navigate('/administration') }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <User size={14} aria-hidden="true" />
              Mon profil
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleStartTour}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <PlayCircle size={14} aria-hidden="true" />
              Reprendre la visite guidée
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={downloadingPdf}
              onClick={handleDownloadManuel}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} aria-hidden="true" />
              Télécharger mon manuel
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={14} aria-hidden="true" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TopBar() {
  const location = useLocation()
  const { profil } = useAuth()
  const { exerciceActif } = useTenant()

  const pageCourante = BREADCRUMB_MAP[location.pathname] ?? 'GCAP-GN'

  const { startTour } = useOnboarding(profil?.id)

  // Callback stable pour que UserDropdown puisse déclencher le tour
  const handleStartTour = useCallback(() => {
    startTour()
    // Le tour sera pris en charge par OnboardingTrigger dans DashboardPage
    // via shouldShowTour devenant true. On navigue vers le dashboard si besoin.
  }, [startTour])

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      {/* Gauche : breadcrumb */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-800">{pageCourante}</span>
      </div>

      {/* Centre : exercice actif */}
      {exerciceActif && (
        <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          Exercice {exerciceActif.annee}
        </span>
      )}

      {/* Droite : install PWA + notifs + user */}
      <div className="flex items-center gap-1">
        <PwaInstallPrompt />
        <NotificationBell data-tour="notification-bell" />
        <UserDropdown onStartTour={handleStartTour} />
      </div>
    </header>
  )
}
