import { cn } from '@/shared/lib/utils'
import { ETAT_BIEN_LABELS, ETAT_BIEN_COLORS } from '../constants'
import type { EtatBien } from '../types'

interface EtatBienBadgeProps {
  etat: EtatBien
}

export function EtatBienBadge({ etat }: EtatBienBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        ETAT_BIEN_COLORS[etat] ?? 'bg-gray-100 text-gray-500'
      )}
    >
      {ETAT_BIEN_LABELS[etat] ?? etat}
    </span>
  )
}
