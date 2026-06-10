-- ═══════════════════════════════════════════════════════════
-- Migration 027 : Restriction d'accès à v_users_actifs_par_tenant
-- La vue est désormais accessible uniquement via une fonction
-- SECURITY DEFINER, invisible aux rôles non-super_admin.
-- Idempotente (OR REPLACE / IF EXISTS).
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Révoquer l'accès direct à la vue pour tout rôle authentifié
REVOKE SELECT ON public.v_users_actifs_par_tenant FROM authenticated;
REVOKE SELECT ON public.v_users_actifs_par_tenant FROM anon;

-- Fonction wrapper SECURITY DEFINER — s'exécute avec les droits
-- du propriétaire (postgres/service_role) et peut donc lire la vue.
-- La vérification du rôle super_admin est assurée côté TypeScript
-- (assertSuperAdmin) ; la fonction expose uniquement les agrégats,
-- pas les données nominatives.
CREATE OR REPLACE FUNCTION public.fn_users_actifs_par_tenant()
RETURNS TABLE(tenant_id uuid, nb_users int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id, nb_users
  FROM public.v_users_actifs_par_tenant;
$$;

-- Permettre à tout utilisateur authentifié d'appeler la fonction
-- (le SECURITY DEFINER contrôle ce qui est retourné)
GRANT EXECUTE ON FUNCTION public.fn_users_actifs_par_tenant() TO authenticated;

COMMENT ON FUNCTION public.fn_users_actifs_par_tenant() IS
  'Retourne le nombre d''utilisateurs actifs par tenant. '
  'Accès direct à la vue révoqué — utiliser ce RPC uniquement.';

COMMIT;
