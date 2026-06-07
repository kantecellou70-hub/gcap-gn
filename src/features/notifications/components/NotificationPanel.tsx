import { useNavigate } from 'react-router-dom'
import {
  Clock, CheckCircle, XCircle, AlertTriangle, BarChart2,
  Bell, CheckCheck, ArrowRight,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Notification, NotificationType } from '../types'

function icone(type: NotificationType) {
  switch (type) {
    case 'engagement_visa_requis': return <Clock       size={15} className="text-amber-500 shrink-0" />
    case 'engagement_vise':        return <CheckCircle size={15} className="text-green-500 shrink-0" />
    case 'engagement_rejete':      return <XCircle     size={15} className="text-red-500  shrink-0" />
    case 'mandat_rejete_tresor':   return <AlertTriangle size={15} className="text-red-500 shrink-0" />
    case 'budget_seuil_90':        return <BarChart2   size={15} className="text-orange-500 shrink-0" />
    default:                       return <Bell        size={15} className="text-slate-400 shrink-0" />
  }
}

function dateRelative(iso: string): string {
  const diff  = (Date.now() - new Date(iso).getTime()) / 1000
  const rtf   = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })
  if (diff < 60)        return rtf.format(-Math.round(diff), 'second')
  if (diff < 3600)      return rtf.format(-Math.round(diff / 60), 'minute')
  if (diff < 86400)     return rtf.format(-Math.round(diff / 3600), 'hour')
  return rtf.format(-Math.round(diff / 86400), 'day')
}

interface NotificationPanelProps {
  notifications:  Notification[]
  unreadCount:    number
  onMarkRead:     (id: string) => void
  onMarkAllRead:  () => void
  onClose:        () => void
}

export function NotificationPanel({
  notifications, unreadCount, onMarkRead, onMarkAllRead, onClose,
}: NotificationPanelProps) {
  const navigate = useNavigate()

  function handleClick(n: Notification) {
    if (!n.lu) onMarkRead(n.id)
    if (n.lien) navigate(n.lien)
    onClose()
  }

  return (
    <div className="absolute right-0 top-10 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {unreadCount > 0 && (
            <p className="text-xs text-slate-500">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50"
          >
            <CheckCheck size={12} />
            Tout lire
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Bell size={24} className="mb-2 opacity-40" />
            <p className="text-sm">Aucune notification</p>
          </div>
        ) : (
          notifications.slice(0, 15).map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={cn(
                'w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                !n.lu && 'bg-indigo-50/60'
              )}
            >
              <div className="mt-0.5">{icone(n.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-slate-800 truncate">{n.titre}</span>
                  {n.priorite === 'urgente' && (
                    <span className="shrink-0 rounded-full bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5">
                      URGENT
                    </span>
                  )}
                  {!n.lu && (
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-slate-400 mt-1">{dateRelative(n.created_at)}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={() => { navigate('/notifications'); onClose() }}
          className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          Voir toutes les notifications
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}
