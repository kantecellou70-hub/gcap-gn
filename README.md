# GCAP-GN — Gestion Comptable Administrative Publique — Guinée

> Plateforme SaaS de comptabilité administrative publique pour les ministères, DAFF, SAFF et EPA de la République de Guinée.

**Développé par [LYNXA SARL](https://lynxatech.com) (LynxaTech) — Conakry, Guinée**

---

## Présentation

GCAP-GN digitalise le cycle complet de la dépense publique guinéenne :

```text
ENGAGEMENT → LIQUIDATION → ORDONNANCEMENT → PAIEMENT
```

L'application est **multi-tenant** : chaque ministère ou EPA dispose d'une instance isolée, avec contrôle d'accès basé sur les rôles (RBAC) conformément aux principes de séparation des fonctions de la LOLF guinéenne.

---

## Stack technique

| Couche | Technologie |
| ------ | ----------- |
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS v3 |
| State serveur | TanStack Query v5 |
| Backend / BDD | Supabase (PostgreSQL + Auth + Storage) |
| Validation | Zod + React Hook Form |
| Routing | React Router v7 |
| Tests | Vitest v1 + Testing Library |

---

## Modules métier

| Module | Description |
| ------ | ----------- |
| **M1 — Budget** | Gestion des crédits, nomenclature budgétaire (titre/chapitre/article/paragraphe) |
| **M2 — Engagements** | Cycle complet engagement → visa CF → liquidation |
| **M3 — Liquidations** | Constatation du service fait, calcul du montant net |
| **M4 — Ordonnancement** | Émission des mandats de paiement vers le Trésor |
| **M5 — Recettes** | Recettes non fiscales des ministères |
| **M6 — Matières** | Comptabilité matières, interface SICOM |
| **M7 — Comptes admin** | Comptes administratifs annuels |
| **M8 — Reporting** | Tableaux de bord, rapports, exports |
| **M10 — Administration** | Paramétrage, gestion des utilisateurs |

---

## Prérequis

- **Node.js** 18.x (⚠️ Node 20+ non encore testé)
- **npm** 9+
- Un projet **Supabase** (gratuit sur [supabase.com](https://supabase.com))

---

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-repo>
cd gcap-gn

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# → Éditer .env.local avec vos clés Supabase

# 4. Appliquer les migrations base de données
npx supabase db push

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
VITE_APP_ENV=development
VITE_DEFAULT_TENANT=mefb
```

⚠️ Ne jamais commiter `.env.local` — il est exclu par `.gitignore`.

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
├── app/              # Providers, Router, layouts
├── features/         # Modules métier (un dossier par module)
│   ├── auth/
│   ├── budget/       # M1
│   ├── engagements/  # M2
│   ├── liquidations/ # M3
│   ├── ordonnancement/ # M4
│   └── ...
└── shared/           # Code partagé
    ├── components/   # Composants UI réutilisables
    ├── hooks/        # useTenant(), useCurrentUser()
    ├── lib/          # supabase.ts, utils.ts, currency.ts
    └── types/        # Types TypeScript globaux

supabase/
├── migrations/       # Schéma SQL versionné
├── functions/        # Edge Functions
└── seed.sql          # Données de test

docs/                 # Documentation métier
```

---

## Rôles utilisateurs

| Rôle | Description |
| ---- | ----------- |
| `SUPER_ADMIN` | Accès total multi-tenant (LYNXA / DSI MEFB) |
| `ADMIN_MINISTERE` | Administrateur d'un ministère |
| `ORDONNATEUR` | Engage et ordonnance les dépenses |
| `DAFF` | Gestionnaire crédits (Direction Administrative et Financière) |
| `SAFF` | Agent de saisie (Service Administratif et Financier) |
| `CF` | Contrôleur Financier — vise les engagements |
| `AUDITEUR` | Lecture seule (Cour des Comptes, Inspection) |

---

## Documentation

| Document | Contenu |
| -------- | ------- |
| [docs/glossaire-guineen.md](docs/glossaire-guineen.md) | Terminologie des finances publiques guinéennes |
| [docs/roles-permissions.md](docs/roles-permissions.md) | Matrice RBAC complète |
| [docs/database-schema.md](docs/database-schema.md) | Schéma base de données |
| [docs/api-conventions.md](docs/api-conventions.md) | Conventions de code et API |
| [docs/workflows/](docs/workflows/) | Cycles dépense et recette |
| [CLAUDE.md](CLAUDE.md) | Mémoire projet pour Claude Code |

---

## Devise et montants

Tous les montants sont en **Franc Guinéen (GNF)**, stockés en `INTEGER` (sans décimales).

```typescript
import { formatGNF } from '@/shared/lib/utils'
formatGNF(1500000) // → "1 500 000 GNF"
```

---

## Licence

Propriétaire — © 2026 LYNXA SARL. Tous droits réservés.
