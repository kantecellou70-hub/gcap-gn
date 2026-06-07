import markSquareUrl from '@/assets/mark-square.svg'
import { cn } from '@/shared/lib/utils'

interface LogoGCAPGNProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
}

const MARK_CLS = {
  sm: 'w-7 h-7 rounded-md',
  md: 'w-9 h-9 rounded-lg',
  lg: 'w-12 h-12 rounded-xl',
}

const TEXT_CLS = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
}

export function LogoGCAPGN({ size = 'md', variant = 'dark' }: LogoGCAPGNProps) {
  const gcapColor = variant === 'light' ? 'text-white'       : 'text-slate-900'
  const gnColor   = variant === 'light' ? 'text-slate-500'   : 'text-slate-400'

  return (
    <div className="flex items-center gap-2">
      <img
        src={markSquareUrl}
        alt=""
        aria-hidden="true"
        className={cn('shrink-0', MARK_CLS[size])}
      />
      <span className={cn('font-bold tracking-tight leading-none', TEXT_CLS[size], gcapColor)}>
        GCAP
        <span className={cn('font-light', gnColor)}>-GN</span>
      </span>
    </div>
  )
}
