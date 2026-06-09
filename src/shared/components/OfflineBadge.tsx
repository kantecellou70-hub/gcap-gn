interface OfflineBadgeProps {
  className?: string
}

export function OfflineBadge({ className = '' }: OfflineBadgeProps) {
  return (
    <span
      title="Brouillon local — en attente de synchronisation"
      className={`inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ${className}`}
    >
      LOCAL
    </span>
  )
}
