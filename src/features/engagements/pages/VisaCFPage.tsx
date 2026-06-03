import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { useEngagementsEnAttenteVisa, useViserEngagement } from '../hooks/useEngagements'
import { EngagementVisaCard } from '../components/EngagementVisaCard'

export function VisaCFPage() {
  const { data: engagements = [], isLoading } = useEngagementsEnAttenteVisa()
  const viser = useViserEngagement()

  return (
    <div>
      <PageHeader
        titre="Visa du Contrôleur Financier"
        description={`${engagements.length} engagement${engagements.length > 1 ? 's' : ''} en attente de visa`}
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-indigo-500" size={28} />
        </div>
      ) : engagements.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <p className="text-lg font-medium">Aucun engagement en attente</p>
          <p className="text-sm mt-1">Tous les engagements soumis ont été traités.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {engagements.map((eng) => (
            <EngagementVisaCard
              key={eng.id}
              engagement={eng}
              isLoading={viser.isPending}
              onViser={() => viser.mutate({ engagementId: eng.id, decision: 'VISE' })}
              onRejeter={(motif) => viser.mutate({ engagementId: eng.id, decision: 'REJETE', motifRejet: motif })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
