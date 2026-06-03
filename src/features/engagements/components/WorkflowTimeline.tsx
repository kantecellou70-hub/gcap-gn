import { Check, Clock, X, Circle } from 'lucide-react'
import { formatDate } from '@/shared/lib/utils'
import { cn } from '@/shared/lib/utils'
import type { Engagement } from '../types'

interface Etape {
  id: string
  label: string
  statuts: string[]
  terminalStatuts?: string[]
}

const ETAPES: Etape[] = [
  { id: 'creation',      label: 'Création',             statuts: ['BROUILLON', 'EN_ATTENTE_VISA', 'VISE', 'REJETE', 'LIQUIDE', 'ORDONNANCE', 'ANNULE'] },
  { id: 'soumission',    label: 'Soumis au CF',         statuts: ['EN_ATTENTE_VISA', 'VISE', 'REJETE', 'LIQUIDE', 'ORDONNANCE'] },
  { id: 'visa',          label: 'Visa Contrôleur',      statuts: ['VISE', 'LIQUIDE', 'ORDONNANCE'], terminalStatuts: ['REJETE'] },
  { id: 'liquidation',   label: 'Liquidation',          statuts: ['LIQUIDE', 'ORDONNANCE'] },
  { id: 'ordonnancement',label: 'Ordonnancement',       statuts: ['ORDONNANCE'] },
]

function getEtapeStatus(etape: Etape, engagement: Engagement): 'done' | 'current' | 'rejected' | 'pending' {
  if (engagement.statut === 'ANNULE') {
    return etape.statuts.includes(engagement.statut) ? 'rejected' : 'pending'
  }
  if (etape.terminalStatuts?.includes(engagement.statut) && etape.id === 'visa') return 'rejected'
  if (etape.statuts.includes(engagement.statut)) return 'done'
  return 'pending'
}

function EtapeIcon({ status }: { status: ReturnType<typeof getEtapeStatus> }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full border-2 shrink-0'
  if (status === 'done')     return <div className={cn(base, 'bg-green-500 border-green-500 text-white')}><Check size={14} /></div>
  if (status === 'rejected') return <div className={cn(base, 'bg-red-500 border-red-500 text-white')}><X size={14} /></div>
  if (status === 'current')  return <div className={cn(base, 'bg-white border-indigo-500 text-indigo-600')}><Clock size={14} /></div>
  return <div className={cn(base, 'bg-white border-slate-300 text-slate-400')}><Circle size={14} /></div>
}

export interface WorkflowTimelineProps {
  engagement: Engagement
}

export function WorkflowTimeline({ engagement }: WorkflowTimelineProps) {
  return (
    <div className="space-y-0">
      {ETAPES.map((etape, idx) => {
        const status = getEtapeStatus(etape, engagement)
        const isLast = idx === ETAPES.length - 1

        let dateLabel: string | undefined
        let agentLabel: string | undefined

        if (etape.id === 'creation') {
          dateLabel = formatDate(engagement.dateCreation)
          agentLabel = engagement.createur
            ? `${engagement.createur.prenom} ${engagement.createur.nom}`
            : undefined
        }
        if (etape.id === 'visa' && engagement.dateVisaCf) {
          dateLabel = formatDate(engagement.dateVisaCf)
          agentLabel = engagement.viseur
            ? `${engagement.viseur.prenom} ${engagement.viseur.nom}`
            : undefined
        }

        return (
          <div key={etape.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <EtapeIcon status={status} />
              {!isLast && (
                <div className={cn(
                  'w-0.5 flex-1 mt-1 mb-1',
                  status === 'done' ? 'bg-green-300' : 'bg-slate-200'
                )} style={{ minHeight: 24 }} />
              )}
            </div>
            <div className="pb-6 flex-1">
              <p className={cn(
                'text-sm font-medium',
                status === 'done'     ? 'text-green-700' :
                status === 'rejected' ? 'text-red-600' :
                status === 'current'  ? 'text-indigo-600' :
                'text-slate-400'
              )}>
                {etape.label}
                {etape.id === 'visa' && engagement.statut === 'REJETE' && (
                  <span className="ml-2 text-xs font-normal text-red-500">— Rejeté</span>
                )}
              </p>
              {dateLabel && <p className="text-xs text-slate-500 mt-0.5">{dateLabel}</p>}
              {agentLabel && <p className="text-xs text-slate-500">{agentLabel}</p>}
              {etape.id === 'visa' && engagement.statut === 'REJETE' && engagement.motifRejet && (
                <p className="mt-1 text-xs text-red-600 bg-red-50 rounded p-2">{engagement.motifRejet}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
