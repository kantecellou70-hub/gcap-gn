import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from './router/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AccesRefuse } from '@/features/auth/AccesRefuse'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/acces-refuse',
    element: <AccesRefuse />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
            Tableau de bord — à implémenter (B2)
          </div>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="text-center">
          <p className="text-6xl font-bold text-slate-300">404</p>
          <p className="mt-2 text-lg">Page introuvable</p>
        </div>
      </div>
    ),
  },
])

export default router
