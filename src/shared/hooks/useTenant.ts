import { useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import type { Tenant } from '@/shared/types'

interface UseTenantResult {
  tenant: Tenant | null
  isLoading: boolean
  error: string | null
}

export function useTenant(): UseTenantResult {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTenant() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('tenant_id, tenants(*)')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        setError(fetchError.message)
      } else if (data?.tenants) {
        setTenant(data.tenants as unknown as Tenant)
      }
      setIsLoading(false)
    }

    fetchTenant()
  }, [])

  return { tenant, isLoading, error }
}
