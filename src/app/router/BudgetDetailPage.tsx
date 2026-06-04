import type { ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { MontantGNF } from '@/shared/components/MontantGNF'
import { useLigneBudgetaire } from '@/features/budget/hooks/useBudget'

export function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: ligne, isLoading, error } = useLigneBudgetaire(id!)

  if (isLoading) return (
    <div className="space-y-4">
      {[1,2,3].map((i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}
    </div>
  )

  if (error || !ligne) return (
    <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700">
      <AlertTriangle size={16} /> Ligne budgétaire introuvable.
    </div>
  )

  return (
    <div>
      <PageHeader
        titre={ligne.libelle}
        description={`${ligne.codeTitre}.${ligne.codeChapitre}.${ligne.codeArticle}${ligne.codeParagraphe ? '.'+ligne.codeParagraphe : ''}`}
        actions={
          <button type="button" onClick={() => navigate('/budget')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft size={16} /> Budget
          </button>
        }
      />
      <div className="max-w-lg bg-white border border-slate-200 rounded-xl p-5">
        <dl className="space-y-3 text-sm">
          {([
            ['Type', ligne.typeCredit],
            ['Crédit initial', <MontantGNF montant={ligne.creditInitial} taille="sm" />],
            ['Crédit révisé',  <MontantGNF montant={ligne.creditRevise}  taille="sm" />],
            ['Engagé',        <MontantGNF montant={ligne.montantEngage}  taille="sm" />],
            ['Liquidé',       <MontantGNF montant={ligne.montantLiquide} taille="sm" />],
            ['Ordonnancé',    <MontantGNF montant={ligne.montantOrdonnance} taille="sm" couleur="success" />],
            ['Disponible',    <MontantGNF montant={ligne.creditDisponible} taille="sm" couleur={ligne.creditDisponible < 0 ? 'danger' : 'success'} />],
            ['Taux exec.',    `${ligne.tauxConsommation}%`],
          ] as [string, ReactNode][]).map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-slate-500">{label}</dt>
              <dd className="font-medium">{val}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
