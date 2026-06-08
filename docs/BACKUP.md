# Politique de Sauvegarde — GCAP-GN

**Version** : 1.0 — Juin 2026  
**Propriétaire** : LYNXA SARL (LynxaTech)  
**Applicable à** : Tous les ministères et EPA abonnés à GCAP-GN

---

## 1. Vue d'ensemble

GCAP-GN repose sur **Supabase** (PostgreSQL managé, hébergé sur AWS eu-west-3 Paris). La politique de sauvegarde distingue trois niveaux selon le plan de souscription du ministère.

Les données couvertes incluent : engagements, liquidations, ordonnances, recettes, comptabilité matières, comptes administratifs, journaux d'audit et pièces jointes (Storage).

---

## 2. Niveaux de sauvegarde

### Niveau 1 — Plan Gratuit / Découverte

| Paramètre | Valeur |
|-----------|--------|
| Fournisseur | Supabase Free Tier |
| Sauvegardes automatiques | **Non incluses** (Free Tier) |
| Point de récupération (RPO) | Aucune garantie |
| Délai de récupération (RTO) | Non garanti |
| Rétention | N/A |
| Sauvegardes manuelles | Possibles via `scripts/backup-manual.sh` |
| Stockage sauvegardes manuelles | Responsabilité du ministère |

> ⚠️ **Avertissement** : Le plan gratuit n'est pas recommandé pour les ministères gérant des données comptables officielles. Il est réservé aux phases de test et d'évaluation.

### Niveau 2 — Plan Pro (Recommandé)

| Paramètre | Valeur |
|-----------|--------|
| Fournisseur | Supabase Pro ($25/mois) |
| Sauvegardes automatiques | **Quotidiennes** (instantané complet) |
| Point de récupération (RPO) | **< 1 minute** (PITR — Point-in-Time Recovery) |
| Délai de récupération (RTO) | **< 4 heures** (objectif contractuel LYNXA) |
| Rétention des sauvegardes | **7 jours** glissants |
| PITR | Activé — récupération à la seconde près |
| Sauvegardes manuelles | Incluses (hebdomadaires, stockées S3 chiffré) |
| Chiffrement | AES-256 (au repos) + TLS 1.3 (en transit) |
| Vérification d'intégrité | Quotidienne (via `v_backup_health`) |

**Déclencheurs de sauvegarde manuelle** :
- Avant toute migration de base de données
- Avant clôture d'exercice budgétaire
- Sur demande du Responsable Technique du ministère

### Niveau 3 — Plan Enterprise

| Paramètre | Valeur |
|-----------|--------|
| Fournisseur | Supabase Enterprise + stockage secondaire |
| Sauvegardes automatiques | **Continues** (WAL streaming) |
| Point de récupération (RPO) | **< 30 secondes** |
| Délai de récupération (RTO) | **< 1 heure** |
| Rétention des sauvegardes | **30 jours** (quotidiennes) + 1 an (mensuelles) |
| Stockage secondaire | Bucket S3 séparé, région EU différente |
| Sauvegardes exportées | JSON chiffré par tenant (mensuel) |
| Signature cryptographique | SHA-256 sur chaque export (auditabilité OHADA) |
| Vérification d'intégrité | Horaire + alerte automatique |
| SLA récupération | Contractualisé (voir `docs/SLA.md`) |

> Le plan Enterprise est recommandé pour le **MEFB** et les structures consolidatrices (DAFF nationale).

---

## 3. Types de données et criticité

| Type de données | Criticité | Rétention légale (OHADA) | Rétention GCAP-GN |
|-----------------|-----------|--------------------------|-------------------|
| Engagements de dépenses | Critique | 10 ans | 10 ans |
| Liquidations / mandats | Critique | 10 ans | 10 ans |
| Journal d'audit | Critique | 10 ans | 10 ans (immuable) |
| Comptes administratifs | Critique | 10 ans | 10 ans |
| Pièces jointes (PDF) | Haute | 10 ans | 10 ans |
| Utilisateurs / profils | Haute | 5 ans | 5 ans |
| Notifications | Basse | 3 mois | 3 mois |
| Données de session | Non conservées | N/A | N/A |

---

## 4. Procédure de sauvegarde manuelle

```bash
# Exécuter depuis la machine du DBA ou du Responsable Technique
./scripts/backup-manual.sh

# Export complet d'un tenant (JSON + signature SHA-256)
./scripts/export-tenant-data.sh <TENANT_ID>
```

Les archives sont nommées `gcap-gn-backup-YYYYMMDD-HHMMSS.dump` et doivent être stockées :
- Sur un disque externe chiffré (AES-256) détenu par le Responsable Technique
- Optionnellement : sur un serveur SFTP du ministère

---

## 5. Tests de restauration

| Fréquence | Périmètre | Responsable |
|-----------|-----------|-------------|
| Mensuel | Restauration sur base de test (tenant DEMO) | LYNXA SRE |
| Trimestriel | Restauration complète (environnement staging) | LYNXA SRE + DAFF |
| Annuel | Test de reprise d'activité complet (PCA) | LYNXA + MEFB |

Les résultats sont consignés dans `docs/INCIDENTS.md`.

---

## 6. Contacts

| Rôle | Contact |
|------|---------|
| Responsable technique LYNXA | support@lynxa.tech |
| Astreinte sauvegardes (Pro/Enterprise) | sre@lynxa.tech |
| Escalade MEFB | Direction des Systèmes d'Information (DSI-MEFB) |
