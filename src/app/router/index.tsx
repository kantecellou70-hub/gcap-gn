import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { AppShell } from '@/app/layouts/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AccesRefuse } from '@/features/auth/AccesRefuse'
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
import { RecettesPage } from './RecettesPage'
import { MatieresPage } from './MatieresPage'
import { CompteAdminPage } from './CompteAdminPage'
import { ReportingPage } from './ReportingPage'
import { AuditPage } from './AuditPage'
import { AdminPage } from './AdminPage'
import { UtilisateursPage } from './UtilisateursPage'

const router = createBrowserRouter([
  // ─── Routes publiques ─────────────────────────────────────
  { path: '/login',          element: <LoginPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/acces-refuse',   element: <AccesRefuse /> },

  // ─── Routes protégées (layout AppShell) ───────────────────
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
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
      { path: '/recettes',                  element: <RecettesPage /> },
      { path: '/matieres',                  element: <MatieresPage /> },
      { path: '/comptes-admin',             element: <CompteAdminPage /> },
      { path: '/reporting',                 element: <ReportingPage /> },
      { path: '/audit',                     element: <AuditPage /> },

      { path: '/administration',            element: <AdminPage /> },
      { path: '/administration/utilisateurs', element: <UtilisateursPage /> },
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
