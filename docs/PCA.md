# Plan de Continuité d'Activité — GCAP-GN

**Version** : 1.0 — Juin 2026  
**Propriétaire** : LYNXA SARL (LynxaTech)  
**Applicable à** : Tous les ministères et EPA abonnés à GCAP-GN  
**Référence** : `docs/SLA.md`, `docs/BACKUP.md`

---

## 1. Objectifs du PCA

| Indicateur | Objectif |
|------------|----------|
| RTO (Recovery Time Objective) | < 4 heures (Pro), < 1 heure (Enterprise) |
| RPO (Recovery Point Objective) | < 1 minute (Pro PITR), < 30 secondes (Enterprise) |
| Disponibilité cible | 99,5 % (Pro), 99,9 % (Enterprise) |

---

## 2. Inventaire des dépendances critiques

| Service | Fournisseur | Criticité | Substitut disponible |
|---------|-------------|-----------|----------------------|
| Base de données PostgreSQL | Supabase (AWS eu-west-3) | Critique | Sauvegarde locale restaurable |
| Authentification (Auth) | Supabase Auth | Critique | Mode lecture seule en dégradé |
| Storage (pièces jointes) | Supabase Storage | Haute | Export S3 ou disque local |
| Hébergement frontend | Vercel | Haute | Build statique sur serveur ministère |
| DNS | Registrar LYNXA | Haute | Redirection IP directe |
| Email transactionnel | Resend | Basse | Désactivé temporairement |

---

## 3. Scénarios de sinistre et procédures de reprise

---

### Scénario A — Panne Supabase (partielle ou totale)

**Symptômes** : L'application affiche des erreurs de connexion, les requêtes échouent, `/health` retourne `degraded` ou `error`.

**Probabilité** : Faible (SLA Supabase : 99,9 %)  
**Impact** : Critique — blocage de toutes les saisies

#### Actions immédiates (0–30 min)

1. **Vérifier** le statut sur [status.supabase.com](https://status.supabase.com) et dans [AWS Service Health](https://health.aws.amazon.com)
2. **Activer le mode maintenance** via variable d'environnement Vercel :
   ```
   VITE_MAINTENANCE_MODE=true
   VITE_MAINTENANCE_END_TIME=<timestamp ISO 8601 estimé>
   ```
   → L'application affiche la `MaintenancePage` (100 % statique, sans appel Supabase)
3. **Notifier les utilisateurs** via le canal de communication de secours (SMS ou email hors-bande)
4. **Ouvrir un ticket** sur support.supabase.io avec référence de l'incident

#### Actions de reprise (30 min–4 h)

5. Si la panne dépasse 1 heure et que les données d'une saisie en cours sont perdues :
   - Récupérer le dernier export JSON depuis `scripts/export-tenant-data.sh`
   - Restaurer depuis le snapshot PITR via le Dashboard Supabase
6. Tester la restauration sur l'environnement staging avant de rétablir la production
7. **Désactiver le mode maintenance** :
   ```
   VITE_MAINTENANCE_MODE=false
   ```
8. Vérifier que `/health` retourne `status: ok`
9. Informer les utilisateurs de la reprise

#### Critère d'activation PITR

- Panne > 2 heures OU perte de données confirmée
- Décision prise par le Responsable Technique LYNXA + accord DAFF du ministère concerné

---

### Scénario B — Bug critique déployé sur Vercel (régression production)

**Symptômes** : Pages en erreur, comportement inattendu sur une ou plusieurs fonctionnalités, signalements utilisateurs.

**Probabilité** : Modérée (risque inhérent à tout déploiement)  
**Impact** : Moyen à Critique selon la fonctionnalité touchée

#### Actions immédiates (0–15 min)

1. **Identifier** le déploiement fautif via Vercel Dashboard → Deployments
2. **Rollback immédiat** vers le dernier déploiement stable :
   ```bash
   vercel rollback <deployment-id> --scope <team>
   # ou via l'interface Vercel : Deployments → sélectionner → Promote to Production
   ```
3. Vérifier que la version précédente est active (`/health` → champ `version`)
4. **Notifier** les utilisateurs si la panne a duré > 10 minutes

#### Actions correctives (15 min–2 h)

5. Reproduire le bug sur l'environnement de staging
6. Corriger le code, faire passer `npm run typecheck && npm run lint && npm run test`
7. Déployer sur staging, valider les cas de test affectés
8. Déployer en production avec confirmation explicite du Responsable Technique

---

### Scénario C — Corruption de données (tenant affecté)

**Symptômes** : Montants incohérents, engagements orphelins, erreurs d'intégrité référentielle.

**Probabilité** : Très faible (RLS + contraintes PostgreSQL + journal d'audit immuable)  
**Impact** : Critique — données comptables officielles

#### Actions immédiates (0–30 min)

1. **Isoler le tenant** affecté : bloquer les connexions en lecture seule via RLS temporaire
2. **Photographier** l'état actuel : exporter les tables concernées via `scripts/export-tenant-data.sh`
3. **Analyser** le journal d'audit (`table_audit_logs`) pour identifier l'origine de la corruption

#### Actions de reprise (30 min–8 h)

4. Identifier le point de temps exact de la corruption via les logs d'audit
5. Activer PITR sur Supabase pour restaurer à T-1 minute avant l'incident
6. Comparer l'état restauré avec l'export pré-restauration
7. Appliquer manuellement les transactions légitimes survenues entre T-restauration et maintenant
8. Faire valider la cohérence par le Contrôleur Financier (CF) du ministère concerné
9. Documenter l'incident dans `docs/INCIDENTS.md`

> **Obligation légale (OHADA)** : Tout incident de corruption affectant des données comptables officielles doit être déclaré au Trésor Public et au MEFB dans les 48 heures.

---

### Scénario D — Compromission de compte (super_admin ou admin_tenant)

**Symptômes** : Connexions suspectes, modifications non autorisées, alertes MFA, accès depuis une IP inconnue.

**Probabilité** : Faible (MFA obligatoire pour les rôles ORDONNATEUR et CF)  
**Impact** : Critique — risque d'exfiltration ou de fraude

#### Actions immédiates (0–15 min)

1. **Révoquer immédiatement** les sessions actives du compte compromis :
   ```sql
   -- Via Supabase Dashboard → Auth → Users → Revoke all sessions
   SELECT supabase_admin.revoke_all_sessions('<user_id>');
   ```
2. **Désactiver** le compte utilisateur concerné dans GCAP-GN :
   ```sql
   UPDATE user_profiles SET is_active = false WHERE id = '<user_id>';
   ```
3. **Auditer** les actions récentes du compte : `SELECT * FROM audit_logs WHERE user_id = '<user_id>' ORDER BY created_at DESC LIMIT 200`
4. **Changer** les clés de service Supabase si un `service_role_key` a été exposé

#### Actions correctives (15 min–24 h)

5. Identifier et annuler (si possible) toute action frauduleuse identifiée
6. Créer un nouveau compte pour l'utilisateur légitime avec de nouvelles credentials
7. Activer MFA sur le nouveau compte avant toute connexion
8. Informer le Responsable Hiérarchique et la DAFF du ministère
9. Déposer une plainte si nécessaire (accès non autorisé à système informatique — loi guinéenne L/2016/037/AN)
10. Documenter l'incident dans `docs/INCIDENTS.md`

---

## 4. Matrice de décision

| Durée de l'incident | Action |
|---------------------|--------|
| < 15 min | Surveiller, pas d'action utilisateur |
| 15–30 min | Activer mode maintenance, notifier |
| 30 min–2 h | Notifier DAFF, préparer restauration PITR |
| > 2 h | Activer PITR, escalade MEFB |
| > 8 h | Plan B (serveur ministère de secours) |

---

## 5. Contacts d'urgence

| Rôle | Contact | Disponibilité |
|------|---------|---------------|
| Astreinte LYNXA SRE | sre@lynxa.tech | 24h/24, 7j/7 (Pro/Enterprise) |
| Responsable Technique | support@lynxa.tech | Jours ouvrés 8h–18h |
| Support Supabase | support.supabase.io | 24h/24 (selon plan) |
| DSI-MEFB | (à compléter par le ministère) | Jours ouvrés |

---

## 6. Test du PCA

Le PCA est testé :
- **Annuellement** : simulation complète scénario A ou C en environnement staging
- **Après chaque incident réel** : révision du scénario correspondant
- **À chaque nouvelle version majeure** de GCAP-GN

Les résultats sont consignés dans `docs/INCIDENTS.md`.
