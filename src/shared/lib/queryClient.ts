import { QueryClient } from '@tanstack/react-query'

export const STALE_TIMES = {
  STABLE:   Infinity,          // nomenclature, tenants — valide toute la session
  LONG:     30 * 60_000,       // user_profiles — 30 min
  MEDIUM:   10 * 60_000,       // exercices, fournisseurs — 10 min
  SHORT:     5 * 60_000,       // lignes budgétaires — 5 min
  DYNAMIC:   1 * 60_000,       // engagements, liquidations, mandats — 1 min
  REALTIME:  0,                // notifications — Realtime Supabase gère l'invalidation
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            STALE_TIMES.DYNAMIC,
      gcTime:               5 * 60_000,
      retry:                2,
      retryDelay:           (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect:   true,
    },
    mutations: {
      retry: 0,
    },
  },
})
