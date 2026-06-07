export type NotificationType =
  | 'engagement_visa_requis'
  | 'engagement_vise'
  | 'engagement_rejete'
  | 'liquidation_prete'
  | 'mandat_emis'
  | 'mandat_rejete_tresor'
  | 'budget_seuil_90'
  | 'exercice_cloture'

export type NotificationPriorite = 'normale' | 'urgente'

export interface Notification {
  id:         string
  tenant_id:  string
  user_id:    string
  type:       NotificationType
  titre:      string
  message:    string
  lu:         boolean
  priorite:   NotificationPriorite
  lien:       string | null
  metadata:   Record<string, unknown>
  created_at: string
  lu_at:      string | null
}
