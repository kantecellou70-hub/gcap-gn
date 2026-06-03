# Architecture GCAP-GN — Décisions (ADR)

## ADR-001 : Stack technique

- **Frontend** : React 18 + Vite + TypeScript
- **Styling** : Tailwind CSS v3
- **State serveur** : TanStack Query v5
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Validation** : Zod + React Hook Form
- **Routing** : React Router v6

## ADR-002 : Multi-tenancy

Isolation par `tenant_id` (colonne UUID) sur toutes les tables métier.
RLS Supabase filtre automatiquement selon le tenant de l'utilisateur connecté.

## ADR-003 : Structure Feature-first

Chaque module métier est autonome dans `src/features/<module>/`.
Le code partagé réside dans `src/shared/`.
