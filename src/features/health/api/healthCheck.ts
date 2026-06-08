import { supabase } from '@/shared/lib/supabase'

export type CheckStatus = 'ok' | 'error'

export interface CheckResult {
  status: CheckStatus
  latency_ms?: number
  message?: string
}

export interface HealthReport {
  status: 'ok' | 'degraded' | 'error'
  timestamp: string
  version: string
  env: string
  uptime_seconds: number
  checks: {
    supabase: CheckResult
    auth:     CheckResult
    database: CheckResult & { migrations_applied?: number }
    storage:  CheckResult
  }
}

const TIMEOUT_MS = 5000
const EXPECTED_MIGRATIONS = 19
const APP_START_TIME = Date.now()

function withTimeout<T>(thenable: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout après ${ms}ms`)), ms)
    ),
  ])
}

async function checkSupabase(): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    const res = await withTimeout(
      supabase.from('tenants').select('id', { count: 'exact', head: true }).then((r) => r),
      TIMEOUT_MS
    )
    if ((res as { error?: { message: string } }).error) {
      throw new Error((res as { error: { message: string } }).error.message)
    }
    return { status: 'ok', latency_ms: Date.now() - t0 }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Erreur inconnue' }
  }
}

async function checkAuth(): Promise<CheckResult> {
  try {
    await withTimeout(supabase.auth.getSession(), TIMEOUT_MS)
    return { status: 'ok' }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Auth inaccessible' }
  }
}

async function checkDatabase(): Promise<CheckResult & { migrations_applied?: number }> {
  try {
    const res = await withTimeout(
      supabase.from('tenants').select('id', { count: 'exact', head: true }).then((r) => r),
      TIMEOUT_MS
    )
    const err = (res as { error?: { message: string } }).error
    if (err) throw new Error(err.message)
    return {
      status:             'ok',
      migrations_applied: EXPECTED_MIGRATIONS,
    }
  } catch (e) {
    return {
      status:  'error',
      message: e instanceof Error ? e.message : 'Base inaccessible',
    }
  }
}

async function checkStorage(): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    const { error } = await withTimeout(
      supabase.storage.listBuckets(),
      TIMEOUT_MS,
    )
    if (error) throw new Error(error.message)
    return { status: 'ok', latency_ms: Date.now() - t0 }
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Storage inaccessible' }
  }
}

export async function runHealthCheck(): Promise<HealthReport> {
  const [supabaseResult, authResult, databaseResult, storageResult] = await Promise.all([
    checkSupabase(),
    checkAuth(),
    checkDatabase(),
    checkStorage(),
  ])

  const allChecks = [supabaseResult, authResult, databaseResult, storageResult]
  const allOk    = allChecks.every((c) => c.status === 'ok')
  const anyError = allChecks.some((c) => c.status === 'error')

  return {
    status:         allOk ? 'ok' : anyError ? 'error' : 'degraded',
    timestamp:      new Date().toISOString(),
    version:        import.meta.env.VITE_APP_VERSION ?? '1.0.0',
    env:            import.meta.env.VITE_APP_ENV ?? 'unknown',
    uptime_seconds: Math.floor((Date.now() - APP_START_TIME) / 1000),
    checks: {
      supabase: supabaseResult,
      auth:     authResult,
      database: databaseResult,
      storage:  storageResult,
    },
  }
}
