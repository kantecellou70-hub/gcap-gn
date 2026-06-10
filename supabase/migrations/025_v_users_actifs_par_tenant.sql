-- ═══════════════════════════════════════════════════════════
-- Migration 025 : Vue v_users_actifs_par_tenant
-- Agrège côté serveur le nombre d'utilisateurs actifs par tenant.
-- Évite de rapatrier toutes les lignes user_profiles côté client
-- pour un simple comptage, et supprime le plafond implicite de
-- 1000 lignes de PostgREST.
-- Idempotente (CREATE OR REPLACE VIEW).
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_users_actifs_par_tenant AS
SELECT
  tenant_id,
  COUNT(*)::int AS nb_users
FROM public.user_profiles
WHERE actif = true
GROUP BY tenant_id;

-- La vue hérite des RLS de user_profiles (security invoker par défaut).
-- La policy super_admin de la migration 022 autorise déjà la lecture
-- cross-tenant — aucune policy supplémentaire n'est nécessaire.

COMMENT ON VIEW public.v_users_actifs_par_tenant IS
  'Nombre d''utilisateurs actifs par tenant. Utilisée par fetchExecutionNationale '
  'pour déterminer si un ministère est configuré sans rapatrier toutes les lignes.';
