import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from './app/providers'
import router from './app/router/index'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)

if (import.meta.env.VITE_APP_ENV === 'production') {
  import('./shared/lib/webVitals').then(({ initWebVitals }) => initWebVitals())
}
