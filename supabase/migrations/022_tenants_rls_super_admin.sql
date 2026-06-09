-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 022 : RLS tenants + SUPER_ADMIN bypass
-- Le SUPER_ADMIN doit voir tous les tenants et tous les profils
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Fonction helper : vérifie si l'utilisateur est SUPER_ADMIN ────────────
-- SECURITY DEFINER : contourne le RLS de user_roles pour éviter la récursion
CREATE OR REPLACE FUNCTION public.fn_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role    = 'SUPER_ADMIN'
      AND actif   = true
  )
$$;

-- ─── 2. Policy SELECT sur tenants ────────────────────────────────────────────
-- SUPER_ADMIN → tous les tenants
-- Autres utilisateurs → uniquement leur propre tenant
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants
  FOR SELECT USING (
    public.fn_is_super_admin()
    OR
    id = public.fn_get_tenant_id()
  );

-- ─── 3. Policy INSERT/UPDATE sur tenants (SUPER_ADMIN uniquement) ────────────
DROP POLICY IF EXISTS "tenants_super_admin_write" ON public.tenants;
CREATE POLICY "tenants_super_admin_write" ON public.tenants
  FOR ALL USING (public.fn_is_super_admin())
  WITH CHECK (public.fn_is_super_admin());

-- ─── 4. user_profiles : le SUPER_ADMIN peut voir tous les profils ────────────
-- (nécessaire pour compter les utilisateurs par ministère)
DROP POLICY IF EXISTS "user_profiles_select_tenant" ON public.user_profiles;
CREATE POLICY "user_profiles_select_tenant" ON public.user_profiles
  FOR SELECT USING (
    public.fn_is_super_admin()
    OR
    tenant_id = public.fn_get_tenant_id()
  );

-- ─── 5. user_roles : le SUPER_ADMIN peut voir tous les rôles ─────────────────
DROP POLICY IF EXISTS "user_roles_select_tenant" ON public.user_roles;
CREATE POLICY "user_roles_select_tenant" ON public.user_roles
  FOR SELECT USING (
    public.fn_is_super_admin()
    OR
    tenant_id = public.fn_get_tenant_id()
  );

-- ─── 6. Policies INSERT sur user_profiles et user_roles (Edge Function) ──────
-- La Edge Function create-ministry-user utilise la service_role (bypasse RLS).
-- Ces policies couvrent le cas où l'insert se fait depuis le client (fallback).
DROP POLICY IF EXISTS "user_profiles_insert_admin" ON public.user_profiles;
CREATE POLICY "user_profiles_insert_admin" ON public.user_profiles
  FOR INSERT WITH CHECK (
    public.fn_is_super_admin()
    OR
    tenant_id = public.fn_get_tenant_id()
  );

DROP POLICY IF EXISTS "user_roles_insert_admin" ON public.user_roles;
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT WITH CHECK (
    public.fn_is_super_admin()
    OR
    tenant_id = public.fn_get_tenant_id()
  );

COMMIT;

-- ─── Vérification ─────────────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('tenants', 'user_profiles', 'user_roles')
ORDER BY tablename, policyname;
