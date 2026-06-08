import { useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000 // refresh if < 5 min remaining

export function useSessionRefresh() {
  useEffect(() => {
    async function checkAndRefresh() {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        await supabase.auth.signOut()
        return
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const msUntilExpiry = expiresAt - Date.now()

      if (msUntilExpiry < REFRESH_THRESHOLD_MS) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          // Token révoqué ou compte désactivé — déconnecter proprement
          await supabase.auth.signOut()
        }
      }
    }

    checkAndRefresh()
  }, [])
}
