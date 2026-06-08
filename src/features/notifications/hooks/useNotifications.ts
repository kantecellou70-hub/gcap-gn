import { useEffect, useState, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/app/contexts/AuthContext'
import { useTenant } from '@/app/contexts/TenantContext'
import {
  fetchNotifications,
  marquerLueDebouncee,
  marquerToutesLues,
} from '../api/notifications-api'
import type { Notification } from '../types'

export interface UseNotificationsReturn {
  notifications:  Notification[]
  unreadCount:    number
  isLoading:      boolean
  markAsRead:     (id: string) => void
  markAllAsRead:  () => Promise<void>
}

export function useNotifications(): UseNotificationsReturn {
  const { profil }   = useAuth()
  const { tenantId } = useTenant()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading]         = useState(true)
  // Identifiant unique par instance du hook pour éviter les conflits de canal Realtime
  // quand NotificationBell et NotificationsPage sont montés simultanément
  const instanceId = useRef(`${Math.random().toString(36).slice(2)}`)

  const userId = profil?.id ?? null

  // Chargement initial
  useEffect(() => {
    if (!userId || !tenantId) return
    setIsLoading(true)
    fetchNotifications(userId, tenantId)
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [userId, tenantId])

  // Abonnement Realtime — canal par utilisateur (multi-tenant strict)
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications-user-${userId}-${instanceId.current}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as Notification

          // Ajouter en tête de liste
          setNotifications((prev) => [notif, ...prev])

          // Toast selon la priorité
          if (notif.priorite === 'urgente') {
            toast.error(`🚨 ${notif.titre}\n${notif.message}`, {
              duration: 8000,
              id: notif.id,
              style: { maxWidth: 400 },
            })
          } else {
            toast(notif.message, {
              duration: 4000,
              id:       notif.id,
              icon:     '🔔',
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = useCallback((id: string) => {
    // Mise à jour optimiste immédiate — l'appel Supabase est debounced (300ms)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, lu: true, lu_at: new Date().toISOString() }
          : n
      )
    )
    marquerLueDebouncee(id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId || !tenantId) return
    await marquerToutesLues(userId, tenantId)
    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, lu: true, lu_at: now }))
    )
  }, [userId, tenantId])

  const unreadCount = notifications.filter((n) => !n.lu).length

  return { notifications, unreadCount, isLoading, markAsRead, markAllAsRead }
}
