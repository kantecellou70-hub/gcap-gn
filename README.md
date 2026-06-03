# GCAP-GN — Gestion Comptable Administrative Publique — Guinée

> Plateforme SaaS de comptabilité administrative publique pour les ministères, DAFF, SAFF et EPA de la République de Guinée.

**Développé par [LYNXA SARL](https://lynxatech.com) (LynxaTech) — Conakry, Guinée**

---

## Présentation

GCAP-GN digitalise le cycle complet de la dépense publique guinéenne, conformément à la LOLF et aux procédures de la DNCF :

```text
ENGAGEMENT → LIQUIDATION → ORDONNANCEMENT → PAIEMENT
```

L'application est **multi-tenant** : chaque ministère ou EPA dispose d'une instance isolée, avec contrôle d'accès basé sur les rôles (RBAC) et séparation stricte des fonctions ordonnateur / comptable / contrôleur.

---

## État d'avancement

| Phase | Statut | Description |
| ----- | ------ | ----------- |
| **Foundation** | ✅ Terminé | Types TS, utilitaires GNF, client Supabase, hooks partagés |
| **Auth B1** | ✅ Terminé | AuthContext, TenantContext, LoginPage, ProtectedRoute, RoleGuard |
| **Layout B2** | ✅ Terminé | AppShell, Sidebar RBAC, TopBar, composants UI partagés |
| **Budget M1** | ✅ Terminé | Lignes budgétaires, vue crédits disponibles, KPIs, formulaire |
| **Engagements M2** | ✅ Terminé | CRUD complet, machine à états, visa CF, workflow timeline |
| **Dashboard** | ✅ Terminé | Vue adaptée au rôle (DAFF/CF), alertes, derniers engagements |
| **Liquidations M3** | 🔜 À venir | |
| **Ordonnancement M4** | 🔜 À venir | |
| **Recettes M5** | 🔜 À venir | |
| **Matières M6** | 🔜 À venir | |
| **Reporting M8** | 🔜 À venir | |
| **Administration M10** | 🔜 À venir | |

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

## Modules métier

| Module | Statut | Description |
| ------ | ------ | ----------- |
| **M1 — Budget** | ✅ | Crédits, nomenclature 4 niveaux, taux consommation, vue SQL calculée |
| **M2 — Engagements** | ✅ | Cycle complet, visa CF, machine à états, auto-numérotation, triggers SQL |
| **M3 — Liquidations** | 🔜 | Constatation du service fait, calcul montant net |
| **M4 — Ordonnancement** | 🔜 | Mandats de paiement vers le Trésor |
| **M5 — Recettes** | 🔜 | Recettes non fiscales des ministères |
| **M6 — Matières** | 🔜 | Comptabilité matières, interface SICOM |
| **M7 — Comptes admin** | 🔜 | Comptes administratifs annuels |
| **M8 — Reporting** | 🔜 | Tableaux de bord, rapports, exports |
| **M10 — Administration** | 🔜 | Paramétrage, gestion des utilisateurs |

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

# 4. Appliquer les migrations Supabase (dans l'ordre)
# Via le dashboard Supabase ou supabase CLI :
# supabase/migrations/001_initial_schema.sql
# supabase/migrations/002_budget_type_credit_vue.sql
# supabase/migrations/003_engagements_triggers.sql

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
```

> ⚠️ Ne jamais commiter `.env.local` — exclu par `.gitignore`.

---

## Créer un utilisateur de test

Après avoir appliqué les migrations, créer un compte via le dashboard Supabase (**Authentication → Users → Add user**) ou via SQL :

```sql
-- 1. Créer l'utilisateur auth
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, role, aud
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'daff@mefb.gov.gn',
  crypt('VotreMotDePasse!', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}', '{}',
  false, 'authenticated', 'authenticated'
) RETURNING id;

-- 2. Créer le profil (remplacer les UUIDs)
INSERT INTO user_profiles (id, tenant_id, nom, prenom, poste)
VALUES ('<user-id>', '<tenant-mefb-id>', 'Diallo', 'Mamadou', 'Gestionnaire DAFF');

-- 3. Attribuer le rôle
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
npm run lint:fix     # ESLint avec correction automatique
npm run format       # Prettier
npm run test         # Tests Vitest (mode run)
npm run test:ui      # Interface Vitest UI
npm run test:watch   # Tests en mode watch
```

---

## Structure du projet

```text
src/
├── app/
│   ├── contexts/       # AuthContext, TenantContext
│   ├── layouts/        # AppShell, Sidebar, TopBar
│   ├── router/         # Routes, ProtectedRoute, RoleGuard
│   └── providers.tsx   # QueryClient + Auth + Tenant + Toaster
├── features/
│   ├── auth/           # Login, ResetPassword, AccesRefuse
│   ├── budget/         # M1 — api/, hooks/, components/, pages/
│   ├── engagements/    # M2 — api/, hooks/, components/, pages/
│   ├── dashboard/      # Tableau de bord multi-rôle
│   └── ...             # M3–M10 (stubs prêts)
└── shared/
    ├── components/     # CarteKPI, DataTable, StatutBadge,
    │                   # MontantGNF, ComboboxRecherche,
    │                   # ConfirmDialog, PageHeader, LogoGCAPGN
    ├── constants/      # permissions.ts, index.ts
    ├── hooks/          # useTenant (wrapper), useCurrentUser
    ├── lib/            # supabase.ts, utils.ts, currency.ts, errors.ts
    └── types/          # Types TypeScript globaux

supabase/
├── migrations/
│   ├── 001_initial_schema.sql        # 9 tables + RLS + tenants démo
│   ├── 002_budget_type_credit_vue.sql # type_credit + vue calculée
│   └── 003_engagements_triggers.sql  # Auto-numérotation + triggers visa
└── seed.sql

docs/
├── glossaire-guineen.md
├── roles-permissions.md
├── database-schema.md
├── api-conventions.md
└── workflows/
```

---

## Base de données

### Tables principales

| Table | Description |
| ----- | ----------- |
| `tenants` | Ministères et EPA (4 de démonstration inclus) |
| `user_profiles` | Profils liés à `auth.users` Supabase |
| `user_roles` | Rôles RBAC par tenant |
| `exercices_budgetaires` | Exercices budgétaires annuels |
| `lignes_budgetaires` | Nomenclature budgétaire avec crédits |
| `engagements_depenses` | Engagements + machine à états + pièces |
| `liquidations` | Liquidations liées aux engagements |
| `mandats_paiement` | Mandats émis vers le Trésor |
| `audit_log` | Journal d'audit immuable (append-only) |

### Vues calculées

| Vue | Description |
| --- | ----------- |
| `vue_credits_disponibles` | `credit_revise - montant_engage` + `taux_consommation` |

### Triggers SQL

| Trigger | Effet |
| ------- | ----- |
| `trg_numero_engagement` | Génère `ENG-{ANNEE}-{CODE}-{SEQ}` à l'insertion |
| `trg_maj_montant_engage` | Met à jour `lignes_budgetaires.montant_engage` au visa CF |

---

## Rôles et permissions

| Rôle | Profil institutionnel | Accès principaux |
| ---- | --------------------- | ---------------- |
| `SUPER_ADMIN` | DSI LYNXA / MEFB | Tout, multi-tenant |
| `ADMIN_MINISTERE` | DAF du ministère | Gestion utilisateurs, budget |
| `ORDONNATEUR` | Ministre / SG | Validation, ordonnancement |
| `DAFF` | Chef DAFF | Budgets, engagements, liquidations |
| `SAFF` | Agent SAFF | Saisie engagements et liquidations |
| `CF` | Contrôleur Financier (DNCF) | Visa / rejet des engagements |
| `COMPTABLE_MATIERES` | Responsable BCM | Comptabilité matières |
| `AUDITEUR` | Cour des Comptes | Lecture seule |
| `GESTIONNAIRE_BUDGET` | Bureau Budget MEFB | Modification crédits |

---

## Documentation

| Document | Contenu |
| -------- | ------- |
| [docs/glossaire-guineen.md](docs/glossaire-guineen.md) | Terminologie finances publiques guinéennes (DAFF, SAFF, RAL, PVSF…) |
| [docs/roles-permissions.md](docs/roles-permissions.md) | Matrice RBAC complète + règles séparation des fonctions |
| [docs/database-schema.md](docs/database-schema.md) | Schéma BDD documenté + contraintes d'intégrité |
| [docs/api-conventions.md](docs/api-conventions.md) | Patterns API, React Query, nommage fichiers |
| [docs/workflows/cycle-depense.md](docs/workflows/cycle-depense.md) | Cycle complet de la dépense publique |
| [CLAUDE.md](CLAUDE.md) | Mémoire projet pour Claude Code (règles absolues) |

---

## Sécurité

- **RLS Supabase** activé sur toutes les tables — isolation tenant garantie côté serveur
- **Multi-tenant** — filtre `tenant_id` obligatoire sur chaque requête frontend
- **RBAC** — `canDo(permission, roles)` côté client + policies SQL côté serveur
- **Audit log** immuable — chaque action sensible est tracée
- **Séparation des fonctions** — enforced en base (contraintes SQL) + frontend (RoleGuard)
- **Montants INTEGER** — jamais de float/decimal pour éviter les erreurs d'arrondi en GNF

---

## Devise

Tous les montants sont en **Franc Guinéen (GNF)**, stockés en `INTEGER`.

```typescript
import { formatGNF } from '@/shared/lib/utils'
formatGNF(1500000) // → "1 500 000 GNF"
```

---

## Licence

Propriétaire — © 2026 LYNXA SARL. Tous droits réservés.
