import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LazyPage } from './LazyPage'
import { ProtectedRoute } from './ProtectedRoute'
import { MfaGuard } from './MfaGuard'
import { AppShell } from '@/app/layouts/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AccesRefuse } from '@/features/auth/AccesRefuse'
import { MfaEnrollPage } from '@/features/auth/mfa/pages/MfaEnrollPage'
import { MfaChallengePage } from '@/features/auth/mfa/pages/MfaChallengePage'
import { DashboardPage } from './DashboardPage'
import { BudgetPage } from './BudgetPage'
import { BudgetDetailPage } from './BudgetDetailPage'
import { EngagementsPage } from './EngagementsPage'
import { EngagementFormPage } from './EngagementFormPage'
import { EngagementDetailPage } from './EngagementDetailPage'
import { VisaCFPage } from './VisaCFPage'
import { LiquidationsPage } from './LiquidationsPage'
import { LiquidationFormPage } from './LiquidationFormPage'
import { LiquidationDetailPage } from './LiquidationDetailPage'
import { OrdonnanncementPage } from './OrdonnanncementPage'
import { MandatFormPage } from './MandatFormPage'
import { MandatDetailPage } from './MandatDetailPage'
import { RecettesPage } from './RecettesPage'
import { RecetteFormPage } from './RecetteFormPage'
import { RecetteDetailPage } from './RecetteDetailPage'
import { AdminPage } from './AdminPage'
import { UtilisateursPage } from './UtilisateursPage'
import { FournisseursPage } from './FournisseursPage'
import { ExercicesPage } from './ExercicesPage'
import { NomenclaturesPage } from '@/features/administration/pages/NomenclaturesPage'
import { HealthPage } from './HealthPage'
import { NotificationsPage } from '@/features/notifications/pages/NotificationsPage'

// Modules lourds — chargés uniquement à la navigation (recharts, jsPDF, xlsx)
const MatieresPage     = lazy(() => import('./MatieresPage').then((m) => ({ default: m.MatieresPage })))
const BienFormPage     = lazy(() => import('./BienFormPage').then((m) => ({ default: m.BienFormPage })))
const BienDetailPage   = lazy(() => import('./BienDetailPage').then((m) => ({ default: m.BienDetailPage })))
const CompteAdminPage  = lazy(() => import('./CompteAdminPage').then((m) => ({ default: m.CompteAdminPage })))
const ReportingPage    = lazy(() => import('./ReportingPage').then((m) => ({ default: m.ReportingPage })))
const AuditPage        = lazy(() => import('./AuditPage').then((m) => ({ default: m.AuditPage })))

const router = createBrowserRouter([
  // ─── Routes publiques ─────────────────────────────────────
  { path: '/login',          element: <LoginPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/acces-refuse',   element: <AccesRefuse /> },
  { path: '/health',         element: <HealthPage /> },

  // ─── Routes protégées ─────────────────────────────────────
  // Auth check (ProtectedRoute) → MFA check (MfaGuard) → AppShell
  // Les pages /mfa/* sont sous ProtectedRoute mais hors MfaGuard
  {
    element: <ProtectedRoute />,
    children: [
      // Pages MFA : accès aux utilisateurs authentifiés, sans passer par MfaGuard
      { path: '/mfa/enroll',    element: <MfaEnrollPage /> },
      { path: '/mfa/challenge', element: <MfaChallengePage /> },

      // Toutes les autres routes protégées passent par MfaGuard puis AppShell
      {
        element: <MfaGuard />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/tableau-de-bord" replace /> },
              { path: '/tableau-de-bord',           element: <DashboardPage /> },

              { path: '/budget',                    element: <BudgetPage /> },
              { path: '/budget/:id',                element: <BudgetDetailPage /> },

              { path: '/engagements',               element: <EngagementsPage /> },
              { path: '/engagements/nouveau',       element: <EngagementFormPage /> },
              { path: '/engagements/:id',           element: <EngagementDetailPage /> },
              { path: '/visa-cf',                   element: <VisaCFPage /> },

              { path: '/liquidations',              element: <LiquidationsPage /> },
              { path: '/liquidations/nouveau',      element: <LiquidationFormPage /> },
              { path: '/liquidations/:id',          element: <LiquidationDetailPage /> },

              { path: '/ordonnancement',            element: <OrdonnanncementPage /> },
              { path: '/ordonnancement/nouveau',    element: <MandatFormPage /> },
              { path: '/ordonnancement/:id',        element: <MandatDetailPage /> },
              { path: '/recettes',                  element: <RecettesPage /> },
              { path: '/recettes/nouveau',          element: <RecetteFormPage /> },
              { path: '/recettes/:id',              element: <RecetteDetailPage /> },

              { path: '/matieres',                  element: <LazyPage><MatieresPage /></LazyPage> },
              { path: '/matieres/nouveau',          element: <LazyPage><BienFormPage mode="create" /></LazyPage> },
              { path: '/matieres/:id',              element: <LazyPage><BienDetailPage /></LazyPage> },
              { path: '/matieres/:id/modifier',     element: <LazyPage><BienFormPage mode="edit" /></LazyPage> },
              { path: '/comptes-admin',             element: <LazyPage><CompteAdminPage /></LazyPage> },
              { path: '/reporting',                 element: <LazyPage><ReportingPage /></LazyPage> },
              { path: '/audit',                     element: <LazyPage><AuditPage /></LazyPage> },

              { path: '/administration',                   element: <AdminPage /> },
              { path: '/administration/utilisateurs',      element: <UtilisateursPage /> },
              { path: '/administration/exercices',         element: <ExercicesPage /> },
              { path: '/administration/fournisseurs',      element: <FournisseursPage /> },
              { path: '/administration/nomenclatures',     element: <NomenclaturesPage /> },
              { path: '/notifications',                    element: <NotificationsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // ─── 404 ──────────────────────────────────────────────────
  {
    path: '*',
    element: (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-7xl font-bold text-slate-200">404</p>
          <p className="mt-3 text-lg text-slate-500">Page introuvable</p>
          <a href="/" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
            Retour à l'accueil
          </a>
        </div>
      </div>
    ),
  },
])

export default router
