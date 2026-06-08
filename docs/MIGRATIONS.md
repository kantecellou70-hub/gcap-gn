# GCAP-GN — Guide des migrations Supabase

## Ordre d'application (obligatoire)

Les migrations doivent être appliquées **dans cet ordre exact**. Chaque migration
dépend des tables créées par les précédentes.

| # | Fichier | Contenu |
|---|---------|---------|
| 001 | `001_initial_schema.sql` | 9 tables fondamentales, RLS, index, seed tenants |
| 002 | `002_budget_type_credit_vue.sql` | Colonne `type_credit`, vue `vue_credits_disponibles` |
| 003 | `003_engagements_triggers.sql` | Auto-numérotation engagements (`ENG-AAAA-CODE-XXXXXX`) |
| 004 | `004_liquidations_mandats_rls_triggers.sql` | RLS complet M3/M4, fonction `fn_get_tenant_id` |
| 005 | `005_liquidations_colonnes_statuts.sql` | Colonnes supplémentaires liquidations |
| 006 | `006_mandats_colonnes_statuts.sql` | Colonnes supplémentaires mandats |
| 007 | `007_recettes_table.sql` | Table recettes non fiscales (M5) |
| 008 | `008_administration_tables.sql` | Tables fournisseurs, RLS administration |
| 009a | `009_audit_triggers_rls.sql` | Triggers audit, fonction `fn_set_updated_at` |
| 009b | `009_matieres.sql` | Table biens (M6), triggers inventaire SICOM |
| 010 | `010_nomenclature_budgetaire.sql` | Référentiel nomenclature + 20 articles seed |
| 011 | `011_storage_engagements.sql` | Bucket `engagements` (10 Mo, 8 MIME types), RLS upload/delete/select par tenant |
| 012 | `012_exercices_rls_update.sql` | RLS complet exercices : SELECT tenant, INSERT/UPDATE (ORDONNATEUR/ADMIN/SUPER_ADMIN), helper `fn_has_role()` |
| 013 | `013_notifications.sql` | Table notifications, types d'événements |
| 014 | `014_notifications_triggers.sql` | Triggers notifications engagement/mandat/budget |
| 015 | `015_notifications_triggers_manquants.sql` | Correctifs triggers liquidation + exercice_cloture |
| 016 | `016_mfa_audit.sql` | Colonnes MFA user_profiles + vue v_mfa_compliance |

> Le fichier `000_seed_check.sql` est un utilitaire de vérification, **pas une migration**.
> Il ne doit pas être appliqué automatiquement — utiliser manuellement si besoin.

---

## Application en local (Supabase CLI)

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Se connecter
supabase login

# 3. Lier au projet
supabase link --project-ref uhvjqfzzmepguatexguu

# 4. Appliquer toutes les migrations en attente
supabase db push

# 5. Vérifier l'état
supabase migration list
```

---

## Application en production (Dashboard)

1. Ouvrir [app.supabase.com](https://app.supabase.com) → Projet GCAP-GN
2. Aller dans **SQL Editor**
3. Coller le contenu de chaque fichier `.sql` dans l'ordre du tableau ci-dessus
4. Exécuter (Run)
5. Vérifier l'absence d'erreur avant de passer à la suivante

---

## Vérifier l'état des migrations

```bash
# Script local (sans connexion DB)
./scripts/check-migrations.sh

# Script avec vérification en base
export SUPABASE_DB_URL="postgresql://postgres:[password]@db.uhvjqfzzmepguatexguu.supabase.co:5432/postgres"
./scripts/check-migrations.sh

# Via Supabase CLI
supabase migration list
```

---

## Rollback en cas d'échec

Les migrations GCAP-GN **ne fournissent pas de fichier DOWN**. En cas d'échec :

1. **Identifier** la migration qui a échoué (l'erreur indique la ligne)
2. **Corriger manuellement** via SQL Editor les effets partiels
3. **Relancer** la migration corrigée

Pour une migration DDL (CREATE TABLE) :
```sql
-- Si la table a été créée à moitié :
DROP TABLE IF EXISTS nom_table CASCADE;
-- Puis relancer la migration
```

Pour une migration DML (INSERT) :
```sql
-- Si des données partielles ont été insérées :
DELETE FROM nom_table WHERE condition;
-- Puis relancer la migration
```

> ⚠️ **Ne jamais supprimer une table contenant des données de production** sans sauvegarde.

---

## Contraintes importantes

- **Montants GNF** : toujours `INTEGER`, jamais `DECIMAL` ou `FLOAT`
- **RLS obligatoire** : chaque nouvelle table doit activer `ENABLE ROW LEVEL SECURITY`
- **Multi-tenant** : chaque table métier doit avoir une colonne `tenant_id UUID NOT NULL`
- **Migrations idempotentes** : utiliser `IF NOT EXISTS`, `OR REPLACE`, `ON CONFLICT DO NOTHING`
- **Pas de DELETE** sur `audit_log` — protégé par règle SQL

---

## Seed manuel de la nomenclature

Si les 20 articles de référence sont manquants après une installation fraîche :

```bash
psql $DATABASE_URL -f supabase/migrations/000_seed_check.sql
```

Ce script vérifie et insère les articles manquants sans dupliquer l'existant.
