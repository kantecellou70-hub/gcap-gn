# GCAP-GN — Gestion Comptable Administrative Publique — Guinée

![GCAP-GN](src/assets/logo-dark.svg)

Plateforme SaaS multi-tenant de comptabilité administrative publique pour les ministères, DAFF, SAFF et EPA de la République de Guinée.

Développé par LYNXA SARL (LynxaTech) — Conakry, Guinée

---

## État d'avancement

| Phase | Statut | Description |
| ----- | ------ | ----------- |
| **Foundation** | ✅ Terminé | Types TS, utilitaires GNF, client Supabase, hooks partagés |
| **Auth** | ✅ Terminé | AuthContext, TenantContext, LoginPage, ProtectedRoute, RoleGuard |
| **Layout** | ✅ Terminé | AppShell, Sidebar RBAC, TopBar, composants UI partagés |
| **M1 — Budget** | ✅ Terminé | Lignes budgétaires, nomenclature, crédits, KPIs, formulaire |
| **M2 — Engagements** | ✅ Terminé | CRUD complet, machine à états, visa CF, workflow timeline |
| **M3 — Liquidations** | ✅ Terminé | CRUD, triggers SQL, montant net calculé, lié à M2 |
| **M4 — Ordonnancement** | ✅ Terminé | Mandats de paiement, export PDF, statuts Trésor |
| **M5 — Recettes** | ✅ Terminé | Recettes non fiscales, constatation, recouvrement |
| **M6 — Matières** | ✅ Terminé | Inventaire biens, interface SICOM (mode simulation) |
| **M7 — Comptes admin** | ✅ Terminé | Synthèse exercice, RAL, RAP, export PDF |
| **M8 — Reporting** | ✅ Terminé | Recharts, exports Excel/PDF |
| **M10 — Administration** | ✅ Terminé | Utilisateurs, fournisseurs, exercices, nomenclatures |
| **Audit** | ✅ Terminé | Journal immuable, lecture seule |
| **Dashboard** | ✅ Terminé | Vue par rôle, alertes, KPIs |
| **Tests RBAC** | ✅ Terminé | 63 tests Vitest — conformité institutionnelle guinéenne, séparation des fonctions |
| **Identité visuelle** | ✅ Terminé | Logo `mark-square.svg` intégré (sidebar, login, reset) |
| **Pièces jointes** | ✅ Terminé | Upload Supabase Storage sur engagements (PDF, images, Word, Excel) |
| **PWA** | 🔜 À venir | Mode offline |
| **Déploiement** | 🔜 À venir | Vercel + variables production |

---

## Cycle de la dépense publique

```text
ENGAGEMENT → LIQUIDATION → ORDONNANCEMENT → PAIEMENT
     ↓              ↓              ↓             ↓
  Réservation   Vérification   Mandat de    Décaissement
  des crédits   du service     paiement     (Trésorerie)
                 fait
```

L'application est **multi-tenant** : chaque ministère ou EPA dispose d'une instance isolée, avec contrôle d'accès basé sur les rôles (RBAC) et séparation stricte des fonctions ordonnateur / comptable / contrôleur, conformément à la LOLF guinéenne.

---

## Stack technique

| Couche | Technologie | Version |
| ------ | ----------- | ------- |
| Frontend | React + TypeScript + Vite | 18 / 5.x / 5.4 |
| Styling | Tailwind CSS | v3 |
| State serveur | TanStack Query | v5 |
| Backend / BDD | Supabase (PostgreSQL 17 + Auth + RLS) | v2 |
| Validation | Zod + React Hook Form | v4 / v7 |
| Routing | React Router | v7 |
| Notifications | react-hot-toast | v2 |
| Tests | Vitest + Testing Library | v1 |
| Runtime | Node.js | 18.x |

---

## Prérequis

- **Node.js** 18.x (⚠️ Node 20+ non encore validé — `util.styleText` manquant)
- **npm** 9+
- Un projet **Supabase** avec les migrations appliquées

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/kantecellou70-hub/gcap-gn.git
cd gcap-gn

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# → Remplir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

# 4. Appliquer les migrations Supabase (dans l'ordre, via dashboard ou CLI)

# 5. Démarrer le serveur de développement
npm run dev
```

L'application est accessible sur **[http://localhost:5173](http://localhost:5173)**

---

## Configuration

Créer `.env.local` à partir de `.env.example` :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-clé-anon

VITE_APP_NAME=GCAP-GN
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development
VITE_DEFAULT_TENANT=mefb

# SICOM — laisser vide pour le mode simulation
VITE_SICOM_URL=
```

> ⚠️ Ne jamais commiter `.env.local` — exclu par `.gitignore`.

---

## Créer un utilisateur de test

```sql
-- 1. Créer le profil (après création de l'utilisateur dans Auth → Users)
INSERT INTO user_profiles (id, tenant_id, nom, prenom, poste)
VALUES ('<user-id>', '<tenant-mefb-id>', 'Diallo', 'Mamadou', 'Gestionnaire DAFF');

-- 2. Attribuer le rôle
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES ('<user-id>', '<tenant-mefb-id>', 'DAFF');
```

---

## Commandes disponibles

```bash
npm run dev          # Serveur de développement (port 5173)
npm run build        # Build de production
npm run preview      # Prévisualiser le build
npm run typecheck    # Vérification TypeScript (zéro erreur tolérée)
npm run lint         # ESLint
npm run test         # Tests Vitest (mode run)
npm run test:ui      # Interface Vitest UI
```

---

## Structure du projet

```text
src/
├── app/
│   ├── contexts/       # AuthContext, TenantContext
│   ├── layouts/        # AppShell, Sidebar, TopBar
│   ├── router/         # Routes, ProtectedRoute, RoleGuard
│   └── providers.tsx
├── features/
│   ├── auth/           # Login, ResetPassword, AccesRefuse
│   ├── budget/         # M1 — api/, hooks/, components/, pages/
│   ├── engagements/    # M2
│   ├── liquidations/   # M3
│   ├── ordonnancement/ # M4
│   ├── recettes/       # M5
│   ├── matieres/       # M6 — biens, SICOM
│   ├── comptes-admin/  # M7
│   ├── reporting/      # M8
│   ├── administration/ # M10 — utilisateurs, fournisseurs, exercices, nomenclatures
│   ├── audit/          # Journal immuable
│   └── dashboard/      # Tableau de bord multi-rôle
└── shared/
    ├── components/     # CarteKPI, DataTable, StatutBadge, MontantGNF, LogoGCAPGN…
    ├── constants/      # permissions.ts
    ├── lib/            # supabase.ts, utils.ts (canDo + ROLE_PERMISSIONS), currency.ts
    └── types/          # Types TypeScript globaux

tests/
└── rbac-conformite.test.ts   # 63 tests — conformité RBAC institutionnelle guinéenne

supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_budget_type_credit_vue.sql
    ├── 003_engagements_triggers.sql
    ├── 004_liquidations_mandats_rls_triggers.sql
    ├── 005_liquidations_colonnes_statuts.sql
    ├── 006_mandats_colonnes_statuts.sql
    ├── 007_recettes_table.sql
    ├── 008_administration_tables.sql
    ├── 009_matieres.sql
    ├── 010_nomenclature_budgetaire.sql
    ├── 011_storage_engagements.sql
    └── 012_exercices_rls_update.sql

public/
├── favicon.svg         # Icône principale (carré arrondi)
├── favicon-16.svg
└── favicon-32.svg

src/assets/
├── logo-dark.svg       # Logo horizontal fond sombre
├── logo-light.svg      # Logo horizontal fond clair
├── mark-square.svg     # Icône carrée seule
└── mark-round.svg      # Icône ronde seule
```

---

## Base de données

### Tables principales

| Table | Description |
| ----- | ----------- |
| `tenants` | Ministères et EPA |
| `user_profiles` | Profils liés à `auth.users` Supabase |
| `user_roles` | Rôles RBAC par tenant |
| `exercices_budgetaires` | Exercices budgétaires annuels |
| `nomenclature_budgetaire` | Référentiel national des codes budgétaires (20 articles seed) |
| `lignes_budgetaires` | Lignes budgétaires par exercice (liées à la nomenclature) |
| `engagements_depenses` | Engagements + machine à états + pièces jointes (Supabase Storage) |
| `liquidations` | Liquidations liées aux engagements |
| `mandats_paiement` | Mandats émis vers le Trésor |
| `biens` | Inventaire matières (M6) — auto-numérotation INV-AAAA-CODE-XXXXXX |
| `recettes` | Recettes non fiscales (M5) |
| `audit_log` | Journal d'audit immuable (append-only) |

### Storage Supabase

| Bucket | Accès | Contenu |
| ------ | ----- | ------- |
| `engagements` | Privé, 10 Mo max | Pièces jointes des engagements (PDF, images, Word, Excel) |

### RLS

Row Level Security activé sur toutes les tables et le bucket Storage. Chaque requête frontend filtre obligatoirement par `tenant_id`.

| Table | Policies |
| ----- | -------- |
| `exercices_budgetaires` | SELECT (tenant) · INSERT/UPDATE (ADMIN_MINISTERE, SUPER_ADMIN) |
| Toutes les autres tables | SELECT/INSERT/UPDATE restreints par tenant + rôle selon la table |

---

## Rôles et permissions

| Rôle | Profil institutionnel | Accès principaux |
| ---- | --------------------- | ---------------- |
| `SUPER_ADMIN` | DSI LYNXA / MEFB | Tout, multi-tenant |
| `ADMIN_MINISTERE` | DAF du ministère | Gestion utilisateurs, budget, nomenclatures |
| `ORDONNATEUR` | Ministre / SG | Validation engagements, émission mandats |
| `DAFF` | Chef DAFF | Budgets, engagements, liquidations, mandats |
| `SAFF` | Agent SAFF | Saisie engagements et liquidations uniquement |
| `CF` | Contrôleur Financier (DNCF) | Visa / rejet des engagements — exclusif |
| `COMPTABLE_MATIERES` | Responsable BCM | Inventaire biens, synchronisation SICOM |
| `AUDITEUR` | Cour des Comptes | Lecture seule absolue — aucune écriture |

La matrice de permissions est vérifiée par **63 tests Vitest** (`tests/rbac-conformite.test.ts`) qui couvrent chaque rôle et la séparation des fonctions (LOLF guinéenne).

---

## Sécurité

- **RLS Supabase** activé sur toutes les tables et le bucket Storage — isolation tenant côté serveur
- **Multi-tenant strict** — filtre `tenant_id` obligatoire sur chaque requête frontend
- **RBAC** — `canDo()` côté client + policies SQL côté serveur, 63 tests de conformité
- **Séparation des fonctions** — ORDONNATEUR ≠ comptable, CF ne crée pas, AUDITEUR lecture seule (LOLF)
- **Audit log** immuable — chaque action sensible tracée (uid, timestamp, payload)
- **Montants INTEGER** — jamais de float/decimal pour éviter les erreurs d'arrondi en GNF
- **Pièces jointes** — bucket Supabase Storage privé, 10 Mo max, types MIME restreints

---

## Devise

Tous les montants sont en **Franc Guinéen (GNF)**, stockés en `INTEGER`.

```typescript
import { formatGNF } from '@/shared/lib/currency'
formatGNF(1500000) // → "1 500 000 GNF"
```

---

## Identité visuelle

| Fichier | Usage |
| ------- | ----- |
| `src/assets/logo-dark.svg` | Header, documents (fond sombre) |
| `src/assets/logo-light.svg` | Impressions, fond blanc |
| `src/assets/mark-square.svg` | App icon, notifications |
| `src/assets/mark-round.svg` | Avatar, profil |
| `public/favicon.svg` | Onglet navigateur |

Couleurs du drapeau guinéen : Rouge `#CE1126` · Jaune `#FCD116` · Vert `#009A44`

---

## Licence

Propriétaire — © 2026 LYNXA SARL. Tous droits réservés.
