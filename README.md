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
| **M9 — Consolidation** | ✅ Terminé | Consolidation multi-tenant, synthèses croisées |
| **M10 — Administration** | ✅ Terminé | Utilisateurs, fournisseurs, exercices, nomenclatures |
| **Audit** | ✅ Terminé | Journal immuable, signatures HMAC-SHA256, export PDF |
| **Dashboard** | ✅ Terminé | Vue par rôle, alertes, KPIs |
| **Tests RBAC** | ✅ Terminé | 152 tests Vitest — conformité institutionnelle guinéenne, séparation des fonctions |
| **Identité visuelle** | ✅ Terminé | Logo `mark-square.svg` intégré (sidebar, login, reset) |
| **Pièces jointes** | ✅ Terminé | Upload Supabase Storage sur engagements (PDF, images, Word, Excel) |
| **Notifications** | ✅ Terminé | Notifications temps réel (cloche), triggers SQL sur engagement/liquidation/mandat/exercice |
| **MFA** | ✅ Terminé | TOTP obligatoire (ORDONNATEUR, CF, SUPER_ADMIN), timeout inactivité 30 min, vue conformité |
| **Performance** | ✅ Terminé | Pagination serveur 25 lignes, cache TanStack Query, lazy loading, Web Vitals, indexes SQL |
| **Sauvegarde & SLA** | ✅ Terminé | Politique 3 niveaux, PCA 4 scénarios, SLA ministères, souveraineté données, mode maintenance |
| **Accessibilité WCAG 2.1 AA** | ✅ Terminé | ARIA, contraste, focus trap, navigation clavier, messages Zod français, responsive 1024×768 |
| **Tour guidé par rôle** | ✅ Terminé | driver.js lazy, 5 tours adaptés (SAFF/CF/ORDONNATEUR/DAFF/AUDITEUR), relançable depuis le menu |
| **Manuel PDF par rôle** | ✅ Terminé | jsPDF lazy — couverture, rôle LOLF, actions pas-à-pas, bandeau tricolore guinéen |
| **Sandbox de formation** | ✅ Terminé | Tenant SANDBOX isolé, bannière violette, seed données fictives `[FORMATION]`, lien login |
| **PWA** | ✅ Terminé | Service Worker Workbox, cache runtime nomenclatures/budget/fournisseurs, mode offline partiel |

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
| Tour guidé | driver.js (lazy) | v1 |
| Génération PDF | jsPDF (lazy) | v4 |
| Tests | Vitest + Testing Library | v1 |
| Runtime | Node.js | 20.x |

---

## Prérequis

- **Node.js** 20.x minimum (requis — déclaré dans `engines` du `package.json`)
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

# Mode maintenance — affiche une page statique sans Supabase
VITE_MAINTENANCE_MODE=false
VITE_MAINTENANCE_END_TIME=          # ISO 8601, ex: 2026-06-09T03:00:00+00:00

# Signature audit (obligatoire en production)
VITE_AUDIT_HMAC_SECRET=             # openssl rand -hex 32
```

> ⚠️ Ne jamais commiter `.env.local` — exclu par `.gitignore`.

### Mode maintenance

Pour activer la page de maintenance (panne Supabase, migration, déploiement) :

```env
VITE_MAINTENANCE_MODE=true
VITE_MAINTENANCE_END_TIME=2026-06-09T03:00:00+00:00
```

La `MaintenancePage` est **100 % statique** — aucun appel Supabase, fonctionne même si la base est indisponible. En production, modifier via **Vercel Dashboard → Settings → Environment Variables** puis redéployer.

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
npm run lint         # ESLint (zéro warning toléré)
npm run test         # Tests Vitest (152 tests, mode run)
npm run test:ui      # Interface Vitest UI
```

**Sandbox de formation** (prérequis : `SUPABASE_SERVICE_ROLE_KEY` dans `.env.local`) :

```bash
# 1. Appliquer la migration si ce n'est pas encore fait
#    → supabase/migrations/023_sandbox_tenant.sql

# 2. Peupler avec les données fictives
npx tsx scripts/seed-sandbox.ts
```

**Scripts de sauvegarde** (prérequis : `SUPABASE_PROJECT_REF` + `SUPABASE_DB_PASSWORD`) :

```bash
./scripts/backup-manual.sh                    # pg_dump complet + SHA-256
./scripts/export-tenant-data.sh <TENANT_ID>   # Export JSON par tenant + checksums
```

---

## Structure du projet

```text
src/
├── app/
│   ├── contexts/       # AuthContext, TenantContext
│   ├── layouts/        # AppShell, Sidebar, TopBar
│   ├── router/         # Routes, ProtectedRoute, RoleGuard, LazyPage
│   └── providers.tsx
├── features/
│   ├── auth/           # Login, ResetPassword, AccesRefuse, MFA
│   ├── budget/         # M1 — api/, hooks/, components/, pages/
│   ├── engagements/    # M2
│   ├── liquidations/   # M3
│   ├── ordonnancement/ # M4
│   ├── recettes/       # M5
│   ├── matieres/       # M6 — biens, SICOM
│   ├── comptes-admin/  # M7
│   ├── reporting/      # M8
│   ├── m9-consolidation/ # M9 — consolidation multi-tenant, synthèses croisées
│   ├── administration/ # M10 — utilisateurs, fournisseurs, exercices, nomenclatures
│   ├── notifications/  # Notifications temps réel — api/, hooks/, pages/
│   ├── audit/          # Journal immuable, export PDF
│   ├── health/
│   │   ├── api/        # healthCheck.ts (Supabase + Auth + DB + Storage + uptime)
│   │   ├── components/ # MaintenancePage.tsx (100 % statique)
│   │   └── pages/      # HealthPage.tsx
│   ├── onboarding/     # Tour guidé, manuel PDF, bannière sandbox
│   │   ├── components/ # OnboardingTrigger, SandboxBanner
│   │   ├── hooks/      # useOnboarding (localStorage)
│   │   └── lib/        # tourConfig.ts, manuelPdf.ts
│   └── dashboard/      # Tableau de bord multi-rôle
└── shared/
    ├── components/     # CarteKPI, DataTable, ServerPaginationControls…
    ├── constants/      # permissions.ts
    ├── hooks/          # useTenant, useCurrentUser, useServerPagination, useFocusTrap
    ├── lib/            # supabase.ts, currency.ts, zodMessages.ts, contrastAudit.ts, queryClient.ts, webVitals.ts
    └── types/          # Types TypeScript globaux

tests/
├── rbac-conformite.test.ts        # 63 tests — conformité RBAC institutionnelle guinéenne
├── audit-signature.test.ts        # Signatures HMAC-SHA256
└── integration/                   # Cycle dépense, budget, notifications (152 tests total)

docs/
├── ACCESSIBILITE.md    # Conformité WCAG 2.1 AA — ratios contraste, composants audités, navigation clavier
├── ONBOARDING.md       # Guide formateur, sandbox, tour guidé, manuel PDF
├── ONBOARDING_MINISTERES.md  # Procédure activation d'un nouveau ministère
├── BACKUP.md           # Politique sauvegarde — Free / Pro / Enterprise
├── PCA.md              # Plan de continuité — 4 scénarios (Supabase, Vercel, corruption, compromission)
├── INCIDENTS.md        # Registre des incidents
├── SLA.md              # Convention de niveau de service — ministères
├── SOUVERAINETE.md     # Hébergement actuel (AWS eu-west-3) + roadmap migration africaine
└── PERFORMANCE.md      # Cibles perf terrain (3G, Core i3) + stratégie cache

scripts/
├── seed-sandbox.ts               # Peuplement tenant SANDBOX avec données [FORMATION]
├── backup-manual.sh              # pg_dump + SHA-256, nettoyage 30 j
├── export-tenant-data.sh         # Export JSON par tenant + checksums OHADA
└── check-migrations.sh

supabase/
└── migrations/
    ├── 000_seed_check.sql
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
    ├── 012_exercices_rls_update.sql
    ├── 013_notifications.sql
    ├── 014_notifications_triggers.sql
    ├── 015_notifications_triggers_manquants.sql
    ├── 016_mfa_audit.sql
    ├── 017_audit_signature_archivage.sql
    ├── 018_performance_indexes.sql
    ├── 019_backup_verification.sql
    ├── 020_m9_consolidation.sql
    ├── 021_seed_ministeres_guinee.sql
    ├── 022_tenants_rls_super_admin.sql
    └── 023_sandbox_tenant.sql       # Tenant SANDBOX formation (idempotent)

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
| `notifications` | Notifications métier temps réel (engagement, liquidation, mandat, exercice, budget) |
| `audit_log` | Journal d'audit immuable (append-only) |

### Fonctions SQL helpers

| Fonction | Description |
| -------- | ----------- |
| `fn_get_tenant_id()` | Retourne le `tenant_id` de l'utilisateur courant (SECURITY DEFINER, sans récursion RLS) |
| `fn_has_role(roles TEXT[])` | Vérifie qu'un rôle actif appartient au tenant courant — utilisé dans les policies INSERT/UPDATE |

### Vue de monitoring

| Vue | Accès | Description |
| --- | ----- | ----------- |
| `v_backup_health` | `postgres` uniquement | Santé des données : engagements orphelins, lignes en dépassement, volume audit |
| `v_mfa_compliance` | `super_admin` | Conformité MFA par tenant |

### Storage Supabase

| Bucket | Accès | Contenu |
| ------ | ----- | ------- |
| `engagements` | Public (URLs directes), 10 Mo max, RLS upload/delete par tenant | Pièces jointes des engagements (PDF, images, Word, Excel) |

### RLS

Row Level Security activé sur toutes les tables et le bucket Storage. Chaque requête frontend filtre obligatoirement par `tenant_id`.

| Table | Policies |
| ----- | -------- |
| `exercices_budgetaires` | SELECT (tenant) · INSERT/UPDATE (ORDONNATEUR, ADMIN_MINISTERE, SUPER_ADMIN) · DELETE interdit |
| `storage.objects` (bucket `engagements`) | SELECT/INSERT/DELETE restreints au `tenant_id` (1er segment du chemin) |
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
- **Audit log** immuable — chaque action tracée (uid, timestamp, payload), signé HMAC-SHA256
- **Montants INTEGER** — jamais de float/decimal pour éviter les erreurs d'arrondi en GNF
- **Pièces jointes** — bucket Supabase Storage public (URLs directes), upload/delete RLS-isolés par tenant, 10 Mo max, types MIME restreints
- **MFA** — TOTP obligatoire pour ORDONNATEUR, CF et SUPER_ADMIN · timeout inactivité 30 min · vue conformité `v_mfa_compliance`
- **Notifications temps réel** — triggers SQL sur les événements métier clés, stockés en base et diffusés via Supabase Realtime
- **Sauvegarde** — pg_dump quotidien (Pro), PITR < 1 min, export tenant JSON + SHA-256 (OHADA)
- **Mode maintenance** — page 100 % statique activable sans Supabase (`VITE_MAINTENANCE_MODE=true`)
- **Souveraineté** — hébergement AWS eu-west-3 Paris, conforme L/2016/037/AN (Guinée) et OHADA

---

## Accessibilité (WCAG 2.1 AA)

Conforme aux critères AA pour les postes terrain guinéens (1024×768, souris + clavier, Chrome/Firefox/Edge).

| Domaine | Implémentation |
| ------- | -------------- |
| ARIA | `aria-label`, `aria-hidden`, `role="group"`, `scope="col"`, `aria-busy`, `aria-expanded` sur tous les composants partagés |
| Contraste | Ratios vérifiés — texte principal 16:1, badges statut 4.5:1+ — voir `src/shared/lib/contrastAudit.ts` |
| Navigation clavier | DataTable navigable (Tab + Enter/Espace), pagination ARIA, `useFocusTrap` disponible pour modals |
| Messages d'erreur | Zod avec messages français via `src/shared/lib/zodMessages.ts` |
| Responsive | Grilles 2 colonnes sous 768px, sidebar scrollable, modals `max-w-[90vw]` |

Documentation complète : [docs/ACCESSIBILITE.md](docs/ACCESSIBILITE.md)

---

## Onboarding & Formation

### Tour guidé

Au premier login, un tour interactif se lance automatiquement après 1 seconde (driver.js, chargé en lazy). 5 parcours selon le rôle : SAFF, CF, Ordonnateur, DAFF, Auditeur. Relançable via le menu utilisateur → "Reprendre la visite guidée".

### Manuel PDF

Menu utilisateur → "Télécharger mon manuel" génère un PDF A4 (jsPDF lazy) avec :

- Couverture personnalisée + bandeau tricolore guinéen
- Description du rôle et séparation des fonctions (LOLF)
- Actions pas-à-pas adaptées au profil
- Page support LYNXA

### Sandbox de formation

Un tenant `SANDBOX` isolé permet la formation sans impacter la production.

```text
URL login → lien "Accéder à l'environnement de formation"
Comptes : saff@ · cf@ · ordonnateur@ · daff@ · auditeur@formation.gcap-gn.gn
```

Une bannière violette sticky identifie clairement l'environnement de formation. Les données sont préfixées `[FORMATION]` et n'apparaissent jamais dans les vrais tenants (RLS).

Documentation complète : [docs/ONBOARDING.md](docs/ONBOARDING.md)

---

## Performance (terrain guinéen)

Cibles pour connexions 3G / machines Core i3 / écrans 1024×768 :

| Indicateur | Cible | Implémentation |
| ---------- | ----- | -------------- |
| Bundle initial | < 300 KB gzip | Lazy loading recharts, jsPDF, xlsx |
| Chargement initial | < 5 s sur 3G | Code splitting + CDN Vercel Edge |
| Pagination | 25 lignes/page | `useServerPagination` + `ServerPaginationControls` |
| Cache données stables | ∞ | `STALE_TIMES.STABLE` (nomenclatures, exercices clôturés) |
| Cache données dynamiques | 1 min | `STALE_TIMES.DYNAMIC` (engagements, mandats) |
| Web Vitals (prod) | LCP < 2,5 s · CLS < 0,1 | `initWebVitals()` via `PerformanceObserver` |

Voir `docs/PERFORMANCE.md` pour le détail complet.

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

## Sauvegarde & continuité

| Document | Contenu |
| -------- | ------- |
| `docs/BACKUP.md` | Politique 3 niveaux (Gratuit / Pro / Enterprise), RPO/RTO, types de données, rétention OHADA |
| `docs/PCA.md` | Plan de continuité — scénarios Supabase ↓, bug Vercel, corruption, compromission compte |
| `docs/INCIDENTS.md` | Registre des incidents (initialement vide) |
| `docs/SLA.md` | Convention niveau de service — disponibilité, délais support P1–P4, pénalités |
| `docs/SOUVERAINETE.md` | Hébergement AWS eu-west-3, cadre légal guinéen, roadmap migration africaine 2027 |

---

## Licence

Propriétaire — © 2026 LYNXA SARL. Tous droits réservés.
