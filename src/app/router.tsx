import { createBrowserRouter } from 'react-router-dom'

// Lazy-loaded pages (will be created per module)
const router = createBrowserRouter([
  {
    path: '/',
    element: <div>GCAP-GN — Chargement...</div>,
  },
])

export default router
