import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [shake, setShake] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const prevUnread = useRef(0)

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  // Animation shake quand une nouvelle notification arrive
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 1000)
      prevUnread.current = unreadCount
      return () => clearTimeout(t)
    }
    prevUnread.current = unreadCount
  }, [unreadCount])

  // Fermer au clic extérieur
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 hover:bg-slate-100 text-slate-500 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} non lues` : ''}`}
      >
        <Bell
          size={18}
          className={cn(shake && 'animate-[wiggle_0.5s_ease-in-out_2]')}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markAsRead}
          onMarkAllRead={markAllAsRead}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
