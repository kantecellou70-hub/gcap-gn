import { cn } from '@/shared/lib/utils'

interface SicomSyncBadgeProps {
  sicomId?: string
  sicomSyncAt?: string
}

export function SicomSyncBadge({ sicomId, sicomSyncAt }: SicomSyncBadgeProps) {
  if (!sicomId) {
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
        Non sync
      </span>
    )
  }

  const syncDate = sicomSyncAt ? new Date(sicomSyncAt) : null
  const now = new Date()
  const diffMs = syncDate ? now.getTime() - syncDate.getTime() : Infinity
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  const isRecent = diffDays < 1
  const isStale  = diffDays >= 7

  const style = cn(
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
    isRecent ? 'bg-green-100 text-green-700' :
    isStale  ? 'bg-amber-100 text-amber-700' :
               'bg-teal-100 text-teal-700'
  )

  const label = isRecent ? 'SICOM ✓' : isStale ? 'SICOM ⚠' : 'SICOM ✓'

  return <span className={style}>{label}</span>
}
