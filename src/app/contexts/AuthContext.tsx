/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { queryClient } from '@/shared/lib/queryClient'
import type { UserProfile } from '@/shared/types'

interface AuthContextValue {
  user: User | null
  profil: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfil(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, tenant:tenants(*), roles:user_roles(role)')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const roles = (data.roles as { role: string }[]).map((r) => r.role)
  return {
    ...data,
    tenantId: data.tenant_id,
    createdAt: data.created_at,
    roles,
  } as unknown as UserProfile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profil, setProfil] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfil(session.user.id).then((p) => {
          if (!p) {
            supabase.auth.signOut()
          } else {
            setProfil(p)
          }
          setIsLoading(false)
        })
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        // Silently update session — no profile reload needed
        setUser(session?.user ?? null)
        return
      }

      if (event === 'MFA_CHALLENGE_VERIFIED') {
        // MFA verified — session is now aal2; reload profile to reflect updated assurance
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchProfil(session.user.id).then((p) => {
            if (p) setProfil(p)
          })
        }
        return
      }

      if (event === 'USER_UPDATED') {
        // e.g. after MFA enrollment — reload profile
        if (session?.user) {
          fetchProfil(session.user.id).then((p) => {
            if (p) setProfil(p)
          })
        }
        return
      }

      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfil(session.user.id).then((p) => {
          if (!p) {
            supabase.auth.signOut()
            setProfil(null)
          } else {
            setProfil(p)
          }
        })
      } else {
        // SIGNED_OUT via expiration de token ou révocation externe
        queryClient.clear()
        sessionStorage.removeItem('gcap-active-tenant-id')
        setProfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } finally {
      // Nettoyage local garanti même si signOut() échoue réseau
      sessionStorage.removeItem('gcap-active-tenant-id')
      queryClient.clear()
      setProfil(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profil,
        isLoading,
        isAuthenticated: !!user && !!profil,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
