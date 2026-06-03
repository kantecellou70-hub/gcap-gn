import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { formatGNF } from '@/shared/lib/utils'

type Couleur = 'slate' | 'indigo' | 'green' | 'amber' | 'red'

interface CarteKPIProps {
  titre: string
  valeur: number | string
  sousTitre?: string
  couleur?: Couleur
  icone?: LucideIcon
  isLoading?: boolean
}

const TRAIT: Record<Couleur, string> = {
  slate:  'bg-slate-400',
  indigo: 'bg-indigo-500',
  green:  'bg-green-500',
  amber:  'bg-amber-400',
  red:    'bg-red-500',
}

const ICONE_COLOR: Record<Couleur, string> = {
  slate:  'text-slate-400',
  indigo: 'text-indigo-500',
  green:  'text-green-500',
  amber:  'text-amber-500',
  red:    'text-red-500',
}

function renderValeur(valeur: number | string): string {
  if (typeof valeur === 'number') return formatGNF(valeur)
  return valeur
}

export function CarteKPI({ titre, valeur, sousTitre, couleur = 'slate', icone: Icone, isLoading = false }: CarteKPIProps) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Trait coloré 3px en haut */}
      <div className={cn('h-[3px] w-full', TRAIT[couleur])} />

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-600">{titre}</p>
          {Icone && <Icone size={18} className={ICONE_COLOR[couleur]} />}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <div className="h-7 bg-slate-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-1/2" />
          </div>
        ) : (
          <>
            <p className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {renderValeur(valeur)}
            </p>
            {sousTitre && (
              <p className="mt-1 text-xs text-slate-500">{sousTitre}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
