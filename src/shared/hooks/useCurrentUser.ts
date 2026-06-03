import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { UserProfile } from '@/shared/types'

interface UseCurrentUserResult {
  user: UserProfile | null
  isLoading: boolean
  error: string | null
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setIsLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setUser(data as UserProfile)
      }
      setIsLoading(false)
    }

    fetchUser()
  }, [])

  return { user, isLoading, error }
}
