import { cn } from '@/shared/lib/utils'
import { formatGNF } from '@/shared/lib/utils'

interface MontantGNFProps {
  montant: number
  taille?: 'xs' | 'sm' | 'md' | 'lg'
  couleur?: 'default' | 'success' | 'danger' | 'muted'
  className?: string
}

const TAILLE_CLASS = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
}

const COULEUR_CLASS = {
  default: 'text-slate-900',
  success: 'text-green-700',
  danger:  'text-red-600',
  muted:   'text-slate-500',
}

export function MontantGNF({
  montant,
  taille = 'sm',
  couleur = 'default',
  className,
}: MontantGNFProps) {
  return (
    <span
      className={cn(
        'font-mono tabular-nums font-medium',
        TAILLE_CLASS[taille],
        COULEUR_CLASS[couleur],
        className
      )}
    >
      {formatGNF(montant)}
    </span>
  )
}
