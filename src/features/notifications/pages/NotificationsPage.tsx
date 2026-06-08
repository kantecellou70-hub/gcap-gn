import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Clock, CheckCircle, XCircle, AlertTriangle, BarChart2, FileCheck, CalendarOff } from 'lucide-react'
import { PageHeader } from '@/shared/components/PageHeader'
import { cn } from '@/shared/lib/utils'
import { useNotifications } from '../hooks/useNotifications'
import type { Notification, NotificationType } from '../types'

type Filtre = 'toutes' | 'non_lues' | 'urgentes'

const TYPE_LABELS: Record<NotificationType, string> = {
  engagement_visa_requis: 'Visa requis',
  engagement_vise:        'Engagement visé',
  engagement_rejete:      'Engagement rejeté',
  liquidation_prete:      'Liquidation prête',
  mandat_emis:            'Mandat émis',
  mandat_rejete_tresor:   'Mandat rejeté Trésor',
  budget_seuil_90:        'Alerte budget 90%',
  exercice_cloture:       'Exercice clôturé',
}

function IconeType({ type }: { type: NotificationType }) {
  switch (type) {
    case 'engagement_visa_requis': return <Clock         size={16} className="text-amber-500" />
    case 'engagement_vise':        return <CheckCircle   size={16} className="text-green-500" />
    case 'engagement_rejete':      return <XCircle       size={16} className="text-red-500" />
    case 'mandat_rejete_tresor':   return <AlertTriangle size={16} className="text-red-500" />
    case 'budget_seuil_90':        return <BarChart2     size={16} className="text-orange-500" />
    case 'liquidation_prete':      return <FileCheck     size={16} className="text-blue-500" />
    case 'exercice_cloture':       return <CalendarOff   size={16} className="text-slate-500" />
    default:                       return <Bell          size={16} className="text-slate-400" />
  }
}

function dateRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf  = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (diff < 60)    return rtf.format(-Math.round(diff), 'second')
  if (diff < 3600)  return rtf.format(-Math.round(diff / 60), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  return new Intl.DateTimeFormat('fr-GN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso))
}

const PER_PAGE = 20

export function NotificationsPage() {
  const navigate          = useNavigate()
  const [filtre, setFiltre] = useState<Filtre>('toutes')
  const [page, setPage]   = useState(0)

  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications()

  const filtered = useMemo(() => {
    switch (filtre) {
      case 'non_lues': return notifications.filter((n) => !n.lu)
      case 'urgentes': return notifications.filter((n) => n.priorite === 'urgente')
      default:         return notifications
    }
  }, [notifications, filtre])

  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  function handleClick(n: Notification) {
    if (!n.lu) markAsRead(n.id)
    if (n.lien) navigate(n.lien)
  }

  return (
    <div>
      <PageHeader
        titre="Notifications"
        description={`${unreadCount} non lue${unreadCount > 1 ? 's' : ''} · ${notifications.length} au total`}
        actions={
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={markAllAsRead}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <CheckCheck size={15} />
              Tout marquer lu
            </button>
          ) : undefined
        }
      />

      {/* Filtres */}
      <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {([
          ['toutes',    'Toutes',    notifications.length],
          ['non_lues',  'Non lues',  unreadCount],
          ['urgentes',  'Urgentes',  notifications.filter((n) => n.priorite === 'urgente').length],
        ] as [Filtre, string, number][]).map(([val, label, count]) => (
          <button
            key={val}
            type="button"
            onClick={() => { setFiltre(val); setPage(0) }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              filtre === val
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn(
                'ml-1.5 rounded-full px-1.5 text-xs font-bold',
                filtre === val ? 'bg-indigo-400 text-white' : 'bg-slate-200 text-slate-600'
              )}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-slate-50 border-b border-slate-100" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Bell size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Aucune notification dans cette catégorie</p>
          </div>
        ) : (
          paginated.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={cn(
                'w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors',
                !n.lu && 'bg-indigo-50/50'
              )}
            >
              <div className="mt-0.5 shrink-0">
                <IconeType type={n.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900">{n.titre}</span>
                  <span className="text-xs text-slate-400 rounded bg-slate-100 px-1.5 py-0.5">
                    {TYPE_LABELS[n.type]}
                  </span>
                  {n.priorite === 'urgente' && (
                    <span className="rounded-full bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5">
                      URGENT
                    </span>
                  )}
                  {!n.lu && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-sm text-slate-600">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{dateRelative(n.created_at)}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>Page {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
