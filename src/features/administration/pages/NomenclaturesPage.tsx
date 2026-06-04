import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { DataTable, type ColonneDef } from '@/shared/components/DataTable'
import { useAuth } from '@/app/contexts/AuthContext'
import { cn } from '@/shared/lib/utils'
import { useNomenclatures } from '../hooks/useAdministration'
import type { NomenclatureBudgetaire } from '@/shared/types'

const TYPE_CREDIT_LABELS: Record<string, string> = {
  FONCTIONNEMENT: 'Fonctionnement',
  INVESTISSEMENT: 'Investissement',
  TRANSFERT:      'Transfert',
}

const TYPE_CREDIT_COLORS: Record<string, string> = {
  FONCTIONNEMENT: 'bg-blue-100 text-blue-700',
  INVESTISSEMENT: 'bg-purple-100 text-purple-700',
  TRANSFERT:      'bg-teal-100 text-teal-700',
}

export function NomenclaturesPage() {
  const navigate   = useNavigate()
  const { profil } = useAuth()

  const [recherche, setRecherche]         = useState('')
  const [typeCreditFiltre, setTypeCredit] = useState('')

  const { data: nomenclatures = [], isLoading } = useNomenclatures()

  const isSuperAdmin = profil?.roles.includes('SUPER_ADMIN' as never) ?? false

  const donnees = useMemo(() => {
    let list = nomenclatures
    if (typeCreditFiltre) list = list.filter((n) => n.typeCredit === typeCreditFiltre)
    if (recherche) {
      const q = recherche.toLowerCase()
      list = list.filter(
        (n) =>
          n.codeArticle.toLowerCase().includes(q) ||
          n.libelleArticle.toLowerCase().includes(q) ||
          n.codeChapitre.toLowerCase().includes(q) ||
          n.libelleChapitre.toLowerCase().includes(q)
      )
    }
    return list
  }, [nomenclatures, recherche, typeCreditFiltre])

  const colonnes: ColonneDef<NomenclatureBudgetaire>[] = [
    {
      key: 'codeArticle',
      header: 'Code article',
      render: (n) => (
        <span className="font-mono text-xs font-semibold text-indigo-600">{n.codeArticle}</span>
      ),
    },
    {
      key: 'libelleArticle',
      header: 'Libellé article',
      render: (n) => (
        <span className="text-sm text-slate-800 truncate max-w-[300px] block">{n.libelleArticle}</span>
      ),
    },
    {
      key: 'codeChapitre',
      header: 'Chapitre',
      render: (n) => (
        <span className="font-mono text-xs text-slate-600">{n.codeChapitre}
          <span className="ml-1 font-sans text-slate-400">{n.libelleChapitre}</span>
        </span>
      ),
    },
    {
      key: 'codeTitre',
      header: 'Titre',
      render: (n) => (
        <span className="font-mono text-xs text-slate-600">{n.codeTitre}
          <span className="ml-1 font-sans text-slate-400">{n.libelleTitre}</span>
        </span>
      ),
    },
    {
      key: 'typeCredit',
      header: 'Type crédit',
      render: (n) => (
        <span className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium',
          TYPE_CREDIT_COLORS[n.typeCredit] ?? 'bg-slate-100 text-slate-600'
        )}>
          {TYPE_CREDIT_LABELS[n.typeCredit] ?? n.typeCredit}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        titre="Nomenclatures budgétaires"
        description={`${donnees.length} article${donnees.length > 1 ? 's' : ''} — Référentiel des codes budgétaires guinéens`}
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => navigate('/administration/nomenclatures/nouveau')}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus size={16} /> Ajouter
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/administration')}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft size={16} /> Administration
            </button>
          </div>
        }
      />

      {/* Filtres */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par code, libellé, chapitre…"
            className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            aria-label="Filtrer par type de crédit"
            value={typeCreditFiltre}
            onChange={(e) => setTypeCredit(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Tous les types</option>
            <option value="FONCTIONNEMENT">Fonctionnement</option>
            <option value="INVESTISSEMENT">Investissement</option>
            <option value="TRANSFERT">Transfert</option>
          </select>
        </div>
      </div>

      <DataTable
        colonnes={colonnes}
        donnees={donnees}
        isLoading={isLoading}
        getRowKey={(n) => n.id}
      />
    </div>
  )
}
