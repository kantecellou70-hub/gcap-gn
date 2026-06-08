# AUDIT — Journal d'audit GCAP-GN

## Architecture

### Qui écrit dans `audit_log`

| Source | Mécanisme | Exemple |
|--------|-----------|---------|
| Triggers SQL | `AFTER INSERT/UPDATE/DELETE` sur les tables métier | Création d'un engagement → INSERT automatique |
| `logAuditEvent()` | Appelé explicitement dans les hooks React (mutations) | Visa CF, émission mandat |

#### Utiliser `logAuditEvent()` dans une feature

```typescript
import { logAuditEvent } from '@/features/audit'
// ou directement :
import { logAuditEvent } from '@/shared/lib/auditLogger'

// Appeler APRÈS la mutation Supabase, dans un try/catch
await logAuditEvent({
  tenantId:   tenant.id,
  userId:     user.id,
  action:     'engagement.visa.cf',
  tableName:  'engagements_depenses',
  recordId:   engagementId,
  oldValues:  { statut: 'EN_ATTENTE' },
  newValues:  { statut: 'VISE', date_visa_cf: new Date().toISOString() },
  exerciceId: exerciceActif?.id,
})
```

`logAuditEvent()` ne lève jamais d'exception — l'échec est loggué silencieusement en console.

### Qui lit `audit_log`

| Rôle | Accès |
|------|-------|
| `AUDITEUR` | Lecture seule — filtre, exporte CSV/PDF |
| `SUPER_ADMIN` | Lecture + archivage |
| `ADMIN_MINISTERE` | Lecture seule — son tenant uniquement |

---

## Signature HMAC-SHA256

### Format du payload signé

```
id|tenant_id|user_id|action|created_at
```

Exemple :
```
550e8400-e29b-41d4-a716-446655440000|abc123...|def456...|engagement.visa.cf|2026-01-15T10:30:00.000Z
```

### Algorithme

- **HMAC** avec hachage **SHA-256**
- **Clé** : `VITE_AUDIT_HMAC_SECRET` (variable d'environnement — 32 octets hex minimum)
- **Résultat** : hex 64 caractères, stocké dans `audit_log.signature`

### Comportement si la clé est absente

- En développement sans `VITE_AUDIT_HMAC_SECRET` : `signature = null`, warning console unique au démarrage
- En production, la colonne doit être remplie — surveiller les `null` dans Supabase

### Vérification manuelle (CLI)

```bash
# Générer la signature attendue pour une entrée
node -e "
const crypto = require('crypto')
const secret = process.env.VITE_AUDIT_HMAC_SECRET
const payload = ['<id>', '<tenant_id>', '<user_id>', '<action>', '<created_at>'].join('|')
const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex')
console.log(sig)
"

# Comparer avec la valeur stockée dans Supabase :
# SELECT signature FROM audit_log WHERE id = '<id>';
```

### Génération de la clé

```bash
openssl rand -hex 32
# → a3f1c2e8b4d7...  (64 caractères hex)
```

---

## Export pour la Cour des Comptes

### Procédure d'export dans GCAP-GN

1. Se connecter en tant qu'`AUDITEUR` ou `SUPER_ADMIN`
2. Naviguer vers `/audit`
3. Appliquer les filtres (exercice, période, etc.)
4. Cliquer **Exporter CSV** ou **Exporter PDF**

### Format CSV

- Encodage : **UTF-8 avec BOM** (compatible Excel)
- Séparateur : **point-virgule** (`;`)
- Colonnes : `Date/Heure | Utilisateur | Action | Table | ID | Anciennes valeurs | Nouvelles valeurs | IP | Signature | Exercice`
- Ligne d'en-tête : `"JOURNAL D'AUDIT GCAP-GN — Export du [timestamp] — Tenant : [nom]"`
- Ligne de pied : `"Nombre d'entrées : N — Signature de l'export : [SHA-256 du contenu]"`

### Format PDF

- Orientation : **A4 paysage**
- Page de couverture : titre, tenant, période, filtres appliqués, nombre d'entrées
- Bandeau tricolore guinéen en bas de la couverture
- Tableau : police 7pt, 6 colonnes, pagination automatique
- **Limite : 500 entrées** — affiche un avertissement si dépassé

---

## Archivage d'un exercice clôturé

### Prérequis

- L'exercice doit avoir `statut = 'CLOTURE'` dans `exercices_budgetaires`
- Seul un `SUPER_ADMIN` peut clôturer un exercice

### Procédure

```sql
-- Dans Supabase SQL Editor (ou via une Edge Function sécurisée)
SELECT archive_audit_exercice('<uuid-exercice>');
-- → Retourne le nombre d'entrées archivées
-- → Les entrées migrent de audit_log vers audit_log_archives
-- → La table audit_log est allégée
```

### Règles d'archivage

- `audit_log_archives` est **immuable** (mêmes règles `no_delete`, `no_update` que `audit_log`)
- Les archives restent accessibles aux `AUDITEUR`/`SUPER_ADMIN` via la même RLS
- En cas d'erreur, la transaction est annulée — aucune perte de données

---

## Actions auditées

| Action | Description | Déclenché par |
|--------|-------------|---------------|
| `INSERT` | Création d'un enregistrement | Trigger SQL |
| `UPDATE` | Modification d'un enregistrement | Trigger SQL |
| `DELETE` | Suppression d'un enregistrement | Trigger SQL |
| `engagement.visa.cf` | Visa du Contrôleur Financier | `logAuditEvent()` |
| `engagement.rejet.cf` | Rejet par le CF | `logAuditEvent()` |
| `mandat.emis` | Émission d'un mandat de paiement | `logAuditEvent()` |
| `liquidation.validee` | Validation d'une liquidation | `logAuditEvent()` |
| `auth.login` | Connexion utilisateur | `logAuditEvent()` |
| `auth.mfa.enrolled` | Enrollment MFA | `logAuditEvent()` |

---

## Conservation des données

| État exercice | Table | Accès |
|---------------|-------|-------|
| Exercice actif (OUVERT) | `audit_log` | Lecture temps réel |
| Exercice clôturé (CLOTURE) | `audit_log_archives` | Lecture archivée |

Les deux tables sont immuables et soumises à RLS tenant.

---

## Vue statistiques `mv_audit_stats`

Rafraîchir manuellement si nécessaire (pour tableaux de bord) :

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_audit_stats;
```

Configurer un job pg_cron si Supabase Pro :

```sql
SELECT cron.schedule('refresh-audit-stats', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_audit_stats');
```
