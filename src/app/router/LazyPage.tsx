import { Suspense } from 'react'

export function PageLoader() {
  return (
    <div className="flex items-center justify-center p-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  )
}

export function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}
