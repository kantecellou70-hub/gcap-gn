# GCAP-GN — Stratégie de Performance

## Contexte terrain

L'application est déployée dans un contexte guinéen spécifique :
- Connexions 3G/4G instables (2–8 Mbps)
- Postes Core i3, 4 Go RAM
- Résolutions 1024×768
- Volumes croissants : milliers d'engagements par exercice budgétaire

---

## Cibles de performance

| Métrique | Cible | Connexion |
|----------|-------|-----------|
| LCP (Largest Contentful Paint) | < 3 s | 3G (8 Mbps) |
| TTI (Time to Interactive) | < 5 s | Core i3, 4 Go RAM |
| Bundle initial (gzip) | < 300 Ko | Premier chargement |
| Chargement liste engagements | < 1 s | 25 lignes, pagination serveur |
| Réponse Supabase P95 | < 500 ms | Requête indexée |
| CLS (Cumulative Layout Shift) | < 0.1 | — |
| TTFB (Time to First Byte) | < 800 ms | CDN Vercel |

---

## Résultats analyse bundle (à compléter après `npm run build`)

Exécuter `npm run build` puis ouvrir `dist/bundle-stats.html` pour obtenir le détail.

| Chunk | Taille gzip estimée | Chargement |
|-------|---------------------|------------|
| Initial (react, react-dom, router, query) | ~80 Ko | Toujours |
| recharts | ~60 Ko | `/reporting` uniquement (lazy) |
| jsPDF | ~120 Ko | Clic "Exporter PDF" uniquement (dynamic import) |
| xlsx | ~40 Ko | Export uniquement |
| Modules métier (engagements, liquidations…) | ~50 Ko total | Selon la route |

---

## Stratégie de cache TanStack Query (STALE_TIMES)

Définis dans `src/shared/lib/queryClient.ts` :

| Catégorie | staleTime | Données | Justification |
|-----------|-----------|---------|---------------|
| `STABLE` | Infini | nomenclature, tenants | Exercice annuel — ne change pas |
| `LONG` | 30 min | user_profiles | Profils stables |
| `MEDIUM` | 10 min | exercices, fournisseurs | Changements rares |
| `SHORT` | 5 min | lignes_budgetaires | Consommées à chaque engagement |
| `DYNAMIC` | 1 min | engagements, liquidations, mandats | Workflow actif |
| `REALTIME` | 0 | notifications | Realtime Supabase invalide le cache |

Configuration globale :
- `refetchOnWindowFocus: false` — évite les rechargements lors de changements d'onglet fréquents
- `refetchOnReconnect: true` — important pour les connexions mobiles instables
- `gcTime: 5 min` — garde les données en mémoire 5 minutes après unmount

---

## Pagination serveur

Toutes les DataTables volumineuses utilisent la pagination serveur (25 lignes/page) :

| Module | Hook paginé | API |
|--------|-------------|-----|
| Engagements | `useEngagementsPaginated` | `fetchEngagementsPaginated` |
| Liquidations | `useLiquidationsPaginated` | `fetchLiquidationsPaginated` |
| Mandats | `useMandatsPaginated` | `fetchMandatsPaginated` |
| Journal d'audit | `useAuditLog` (déjà paginé) | `fetchAuditLogs` |

Composant UI : `src/shared/components/ServerPaginationControls.tsx`

Hook générique : `src/shared/hooks/useServerPagination.ts`
- Utilise `placeholderData: keepPreviousData` — pas de flash "liste vide"
- Préchargement automatique de la page suivante après chaque chargement

---

## Lazy loading des modules lourds

Modules chargés uniquement à la navigation (code splitting) :

| Route | Chunk | Justification |
|-------|-------|---------------|
| `/matieres` | `MatieresPage` | Module rarement visité |
| `/comptes-admin` | `CompteAdminPage` | Module annuel |
| `/reporting` | `ReportingPage` | Contient recharts |
| `/audit` | `AuditPage` | Contient jsPDF (export) |

Import dynamique de jsPDF :
- `src/features/audit/lib/auditExport.ts` — chargé au clic "Exporter PDF"
- `src/features/ordonnancement/lib/mandat-pdf.ts` — chargé au clic "Exporter PDF"

---

## Indexes de base de données

Migration : `supabase/migrations/018_performance_indexes.sql`

| Index | Table | Colonnes | Usage |
|-------|-------|----------|-------|
| `idx_engagements_tenant_exercice_created` | `engagements_depenses` | `tenant_id, exercice_id, created_at DESC` | Pagination liste |
| `idx_engagements_tenant_statut` | `engagements_depenses` | `tenant_id, statut` (partial) | Filtre par statut |
| `idx_liquidations_tenant_statut_created` | `liquidations` | `tenant_id, statut, created_at DESC` | Pagination liste |
| `idx_mandats_tenant_statut_emission` | `mandats_paiement` | `tenant_id, statut, date_emission DESC` | Pagination liste |
| `idx_lignes_tenant_nomenclature` | `lignes_budgetaires` | `tenant_id, code_titre, ...` | Lookup formulaires |
| `idx_audit_tenant_created` | `audit_log` | `tenant_id, created_at DESC` | Pagination /audit |

---

## Monitoring Web Vitals

Module : `src/shared/lib/webVitals.ts`

Activé uniquement en production (`VITE_APP_ENV === 'production'`). Mesure LCP, FID, CLS, TTFB, INP via l'API native `PerformanceObserver`. Les métriques sont loggées en console et un warning est émis si une métrique dépasse 2× son seuil.

---

## Optimisations SELECT Supabase

Constantes centralisées dans `src/shared/lib/supabaseSelects.ts`.

Gains principaux :
- Listes : pas de jointures `user_profiles` (createur/viseur) — économise ~50% du payload
- Engagements stats KPI : seulement `id, statut, montant_engage` (2 colonnes vs ~25)
- Audit list : seulement les colonnes affichées, pas `old_values`/`new_values` (JSONB lourd)
