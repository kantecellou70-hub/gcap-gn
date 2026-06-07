# GCAP-GN — Système de notifications temps réel

## Architecture

```
Événement DB (INSERT/UPDATE)
        ↓
  Trigger SQL (014)
        ↓
  dispatch_notification()        ← SECURITY DEFINER
        ↓
  Table notifications             ← RLS activé
        ↓
  Supabase Realtime (WebSocket)   ← canal par user_id
        ↓
  useNotifications hook           ← React state + toast
        ↓
  NotificationBell (TopBar)       ← badge + panel

        ↓ (si priorite = 'urgente')
  Webhook Supabase
        ↓
  Edge Function send-notification-email
        ↓
  API Resend → Email HTML
```

---

## Matrice des événements → destinataires

| Événement | Type | Priorité | Destinataires |
|-----------|------|----------|--------------|
| Engagement soumis au CF | `engagement_visa_requis` | normale | CF |
| Engagement visé | `engagement_vise` | normale | DAFF, SAFF |
| Engagement rejeté | `engagement_rejete` | **urgente** | DAFF, SAFF, ORDONNATEUR |
| Liquidation prête | `liquidation_prete` | normale | ORDONNATEUR |
| Mandat émis | `mandat_emis` | normale | DAFF |
| Mandat rejeté Trésor | `mandat_rejete_tresor` | **urgente** | ORDONNATEUR, DAFF |
| Budget ligne à 90% | `budget_seuil_90` | **urgente** | ORDONNATEUR, ADMIN_MINISTERE |
| Exercice clôturé | `exercice_cloture` | normale | Tous les utilisateurs du tenant |

Les notifications **urgentes** déclenchent :

1. Un toast rouge persistant 8 secondes dans l'app
2. Un email transactionnel via Resend (si configuré)

---

## Configuration du webhook email

Dans **Supabase Dashboard → Database → Webhooks → Create webhook** :

```
Name    : send-urgent-notification-email
Table   : notifications
Events  : INSERT
URL     : https://{project-ref}.supabase.co/functions/v1/send-notification-email
Method  : POST
Headers :
  Content-Type  : application/json
  Authorization : Bearer {SUPABASE_SERVICE_ROLE_KEY}
```

Variables à configurer dans **Supabase → Edge Functions → Secrets** :

```
RESEND_API_KEY           → clé API Resend (obtenir sur resend.com/api-keys)
APP_URL                  → https://gcap-gn.vercel.app
```

---

## Activer Supabase Realtime

Dans **Supabase Dashboard → Database → Replication** :

1. Activer **Realtime** sur la table `notifications`
2. Vérifier que `REPLICA IDENTITY FULL` est appliqué (fait par migration 013)

---

## Tester les notifications en local

```bash
# 1. Démarrer l'app
npm run dev

# 2. Démarrer les Edge Functions
supabase functions serve send-notification-email --env-file .env.local

# 3. Simuler un événement dans Supabase SQL Editor :
UPDATE engagements_depenses
SET statut = 'EN_ATTENTE_VISA'
WHERE id = '<uuid-engagement>';

# → La cloche doit se mettre à jour en temps réel
# → Un toast doit apparaître
```

Pour tester une notification urgente :

```sql
UPDATE mandats_paiement
SET statut = 'REJETE_TRESOR'
WHERE id = '<uuid-mandat>';
-- → Toast rouge 8s + email si RESEND_API_KEY configuré
```

---

## Ajouter un nouveau type de notification

**Checklist en 5 étapes :**

1. **`src/features/notifications/types.ts`** — ajouter la valeur dans `NotificationType`
2. **`supabase/migrations/013_notifications.sql`** — ajouter la valeur dans le `CHECK` du champ `type`
3. **`supabase/migrations/014_notifications_triggers.sql`** — ajouter le cas dans la fonction trigger concernée (ou créer un nouveau trigger)
4. **`src/features/notifications/components/NotificationPanel.tsx`** — ajouter l'icône dans `icone()`
5. **`src/features/notifications/pages/NotificationsPage.tsx`** — ajouter le libellé dans `TYPE_LABELS`

---

## Sécurité

- **RLS strict** : chaque utilisateur ne voit que ses propres notifications
- **SECURITY DEFINER** : la fonction `dispatch_notification` tourne avec les droits système — les clients ne peuvent jamais insérer directement
- **Canal Realtime isolé** : `notifications-user-{userId}` — jamais de canal global
- **Cleanup** : `supabase.removeChannel()` au démontage du composant — pas de fuite WebSocket
- **Pas de données sensibles** dans les métadonnées (montants oui, données personnelles non)
