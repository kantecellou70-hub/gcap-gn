# GCAP-GN — Mémoire Projet Claude Code

## Identité du projet

- **Nom** : GCAP-GN — Gestion Comptable Administrative Publique Guinée
- **Promoteur** : LYNXA SARL (LynxaTech), Conakry, Guinée
- **Type** : SaaS web multi-tenant — Comptabilité Administrative Publique
- **Cible** : Ministères guinéens, DAFF, SAFF, EPA
- **Stack** : React 18 + Vite + TypeScript + Tailwind + Supabase + React Query

## Commandes essentielles

```bash
npm run dev          # Serveur de développement (port 5173)
npm run build        # Build de production
npm run typecheck    # Vérification TypeScript (TOUJOURS après une série de changements)
npm run lint         # ESLint
npm run test         # Tests Vitest
npm run test:ui      # Interface Vitest UI
```

## Workflow de vérification OBLIGATOIRE

Après CHAQUE série de modifications de code :

```bash
npm run typecheck   # zéro erreur TypeScript tolérée
npm run lint        # zéro warning ESLint toléré
npm run test        # tous les tests doivent passer
```

Vérifier aussi la console navigateur — zéro erreur runtime.

## Règles ABSOLUES

### 1. Multi-tenant — Obligatoire sur CHAQUE requête

```typescript
// ✅ CORRECT — toujours avec tenant_id
const { data } = await supabase
  .from('engagements_depenses')
  .select('*')
  .eq('tenant_id', tenant.id)
  .order('created_at', { ascending: false })

// ❌ INTERDIT — jamais sans tenant_id
const { data } = await supabase.from('engagements_depenses').select('*')
```

- Utiliser `useTenant()` (`@/shared/hooks/useTenant`) pour accéder au tenant courant
- Le `tenant_id` = identifiant du ministère/EPA connecté
- RLS Supabase est une seconde barrière, pas un substitut au filtre frontend

### 2. Séparation des fonctions (principe légal guinéen)

| Rôle | PEUT | NE PEUT PAS |
| ---- | ---- | ----------- |
| `AGENT_SAISIE` | Créer des saisies | Valider ses propres saisies |
| `CF` (Contrôleur Financier) | Viser/valider | Créer des engagements |
| `ORDONNATEUR` | Engager, ordonnancer | Encaisser/payer |
| `COMPTABLE` | Payer, encaisser | Ordonnancer |

Ces contraintes sont appliquées **côté backend (RLS)** ET **côté frontend**. Ne jamais bypasser, même pour les tests.

### 3. Montants — Francs Guinéens uniquement

- Devise : **GNF** (ISO 4217) — Franc Guinéen
- Stockage : `INTEGER` (pas de décimales en GNF)
- Formatter : `new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(montant)`
- Utilitaire disponible : `formatGNF(montant)` dans `@/shared/lib/currency`
- **Ne jamais** utiliser USD, EUR ou `float` pour les montants

### 4. Sécurité données

- **Ne jamais commiter** `.env.local` ou toute clé API réelle
- **RLS obligatoire** sur chaque nouvelle table Supabase
- **TypeScript strict** — aucun `any` sans commentaire justificatif
- **Migrations irréversibles** → demander confirmation explicite
- **Données personnelles** → conformité RGPD-like (contexte guinéen)

## Architecture

### Modules métier (features/)

| Dossier | Module | Description |
|---------|--------|-------------|
| `auth/` | Authentification | Sessions, RBAC, MFA |
| `budget/` | M1 — Budget | Crédits, nomenclature budgétaire |
| `engagements/` | M2 — Engagements | Dépenses engagées |
| `liquidations/` | M3 — Liquidations | Vérification des droits |
| `ordonnancement/` | M4 — Ordonnancement | Mandats de paiement |
| `recettes/` | M5 — Recettes | Recettes non fiscales |
| `matieres/` | M6 — Matières | Comptabilité matières |
| `comptes-admin/` | M7 — Comptes | Comptes administratifs annuels |
| `reporting/` | M8 — Reporting | Tableaux de bord, rapports |
| `administration/` | M10 — Admin | Paramétrage, utilisateurs |

### Structure d'une feature (pattern STRICT)

```
features/<module>/
├── components/     # Composants React spécifiques à la feature
├── hooks/          # useQuery, useMutation pour cette feature
├── api/            # Fonctions Supabase — jamais de requêtes dans les composants
├── types.ts        # Types TypeScript de la feature
├── constants.ts    # Constantes spécifiques à la feature
└── index.ts        # Exports publics de la feature
```

### Hooks partagés clés

- `useTenant()` — `@/shared/hooks/useTenant` — tenant courant (obligatoire)
- `useCurrentUser()` — `@/shared/hooks/useCurrentUser` — utilisateur & rôle

## Conventions de nommage

| Élément | Convention | Exemple |
| ------- | ---------- | ------- |
| Tables BDD | snake_case pluriel | `engagements_depenses`, `lignes_budgetaires` |
| Colonnes BDD | snake_case | `montant_engage`, `date_visa_cf`, `numero_mandat` |
| Composants React | PascalCase | `EngagementCard`, `BudgetDashboard` |
| Hooks | `use` + camelCase | `useEngagements`, `useBudgetSolde` |
| Types TS | PascalCase + `Type` | `EngagementType`, `RoleType` |
| Fichiers non-composants | kebab-case | `budget-api.ts`, `use-engagements.ts` |

### Ordre des imports

```typescript
// 1. React et librairies externes
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Shared (alias @/)
import { supabase } from '@/shared/lib/supabase'
import { useTenant } from '@/shared/hooks/useTenant'
import { formatGNF } from '@/shared/lib/currency'

// 3. Feature locale
import { fetchEngagements } from './api/engagements-api'
```

## Base de données (Supabase)

### Migrations

- Nommage : `YYYYMMDD_HHMMSS_description.sql`
- Jamais de `DROP` sans backup confirmé
- Toujours idempotentes (`IF EXISTS` / `IF NOT EXISTS`)
- RLS + policies à créer dans la même migration que la table

### Template migration standard

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS public.ma_table (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ma_table ENABLE ROW LEVEL SECURITY;

-- Policy : lecture limitée au tenant
CREATE POLICY "tenant_select" ON public.ma_table
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );

COMMIT;
```

## Rôles et permissions (RBAC)

| Rôle | Description |
| ---- | ----------- |
| `super_admin` | LYNXA — accès total multi-tenant |
| `admin_tenant` | Administrateur d'un ministère |
| `ordonnateur` | Engage et ordonnance les dépenses |
| `comptable` | Saisie, liquidation, paiement |
| `cf` | Contrôleur Financier — vise, valide |
| `controleur` | Lecture + validation (DAFF/SAFF) |
| `auditeur` | Lecture seule, tous modules |
| `agent_saisie` | Saisie uniquement, sans validation |

## Terminologie guinéenne clé

- **DAFF** : Direction Administrative et Financière (niveau Ministère)
- **SAFF** : Sous-direction Administrative et Financière
- **EPA** : Établissement Public Administratif
- **MEFB** : Ministère de l'Économie, des Finances et du Budget
- **CF** : Contrôleur Financier — vise les engagements
- **LOLF** : Loi Organique relative aux Lois de Finances
- **Ordonnateur** : Agent habilité à engager et ordonnancer les dépenses
- **Comptable public** : Agent du Trésor chargé du paiement
- **GNF** : Franc Guinéen (devise officielle)

## Cycle de la dépense publique (Guinée)

```text
ENGAGEMENT → LIQUIDATION → ORDONNANCEMENT → PAIEMENT
     ↓              ↓              ↓             ↓
  Réservation   Vérification   Mandat de    Décaissement
  des crédits   du service     paiement     (Trésorerie)
                 fait
```

## Intégrations prévues

- **SICOM** : Système Intégré de la Comptabilité (MEFB) — feature flag
- **Trésor public** : Virement automatique des mandats — feature flag
- **SIGFIP** : Suivi budgétaire national — phase 2

## Patterns INTERDITS — Anti-patterns

### Sécurité

- `supabase.from('table').select('*')` sans `.eq('tenant_id', ...)` — **faille critique**
- Stocker des clés API dans le code source — **interdit absolu**
- Bypasser la vérification de rôle avec `process.env.NODE_ENV === 'test'`
- Utiliser `any` en TypeScript sans commentaire justificatif

### Métier

- Créer une liquidation sur un engagement non-`VISE`
- Émettre un mandat sans liquidation `VALIDEE`
- Utiliser des montants en `float` ou `decimal` pour les GNF
- Hardcoder un `tenant_id` — même pour les tests (utiliser le tenant `DEMO`)

### Code

- Mettre de la logique métier dans les composants React → doit aller dans les hooks
- Faire des requêtes Supabase directement dans les composants → doit aller dans `api/`
- Ignorer les erreurs Supabase sans les logger
- Commiter `.env.local` ou des fichiers contenant de vraies clés
