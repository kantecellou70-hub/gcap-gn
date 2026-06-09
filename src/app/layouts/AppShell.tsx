import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useInactivityTimeout } from '@/shared/hooks/useInactivityTimeout'
import { SessionWarningModal } from '@/features/auth/components/SessionWarningModal'
import { ImpersonationBanner } from '@/shared/components/ImpersonationBanner'
import { supabase } from '@/shared/lib/supabase'

export function AppShell() {
  const navigate = useNavigate()
  const [showWarning, setShowWarning] = useState(false)

  const { resetTimer, remainingMs } = useInactivityTimeout({
    onWarning: () => setShowWarning(true),
    onTimeout: async () => {
      setShowWarning(false)
      await supabase.auth.signOut()
      navigate('/login?reason=timeout', { replace: true })
    },
  })

  function handleStayConnected() {
    setShowWarning(false)
    resetTimer()
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {showWarning && (
        <SessionWarningModal
          remainingMs={remainingMs}
          onStayConnected={handleStayConnected}
          onClose={() => setShowWarning(false)}
        />
      )}
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-0">
        <TopBar />
        <ImpersonationBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
