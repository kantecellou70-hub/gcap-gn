-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 012 : RLS complet exercices_budgetaires
-- SELECT + INSERT + UPDATE avec contrôle par rôle
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════
--
-- La migration 001 a activé RLS sur exercices_budgetaires sans
-- créer aucune policy → tous les accès authentifiés étaient bloqués.
-- Cette migration ajoute :
--   SELECT  → tous les membres du tenant (lecture)
--   INSERT  → ORDONNATEUR, ADMIN_MINISTERE, SUPER_ADMIN
--   UPDATE  → ORDONNATEUR, ADMIN_MINISTERE, SUPER_ADMIN
--   DELETE  → interdit (exercices clos = données fiscales permanentes)
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── HELPER : vérifie qu'un rôle actif appartient au tenant courant ───────────

CREATE OR REPLACE FUNCTION public.fn_has_role(roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id   = auth.uid()
      AND ur.tenant_id = public.fn_get_tenant_id()
      AND ur.role      = ANY(roles)
      AND ur.actif     = true
  )
$$;

-- ─── 1. SELECT — lecture tenant-wide ──────────────────────────────────────────
-- Supprime aussi les anciennes policies pré-existantes pour éviter les doublons.

DROP POLICY IF EXISTS "exercices_select"        ON public.exercices_budgetaires;
DROP POLICY IF EXISTS "exercices_select_tenant" ON public.exercices_budgetaires;
CREATE POLICY "exercices_select" ON public.exercices_budgetaires
  FOR SELECT
  USING (tenant_id = public.fn_get_tenant_id());

-- ─── 2. INSERT — création d'un exercice budgétaire ────────────────────────────
-- Réservé aux rôles habilités à ouvrir un exercice (ordonnateur ou admin)
-- Le tenant_id fourni doit correspondre au tenant de l'utilisateur.

DROP POLICY IF EXISTS "exercices_insert"       ON public.exercices_budgetaires;
DROP POLICY IF EXISTS "exercices_insert_admin" ON public.exercices_budgetaires;
CREATE POLICY "exercices_insert" ON public.exercices_budgetaires
  FOR INSERT
  WITH CHECK (
    tenant_id = public.fn_get_tenant_id()
    AND public.fn_has_role(ARRAY['ORDONNATEUR', 'ADMIN_MINISTERE', 'SUPER_ADMIN'])
  );

-- ─── 3. UPDATE — modification du statut / dates ───────────────────────────────
-- Même périmètre que INSERT : seuls les rôles budgétaires peuvent modifier.
-- La clôture (statut → CLOTURE) déclenche le trigger notif 015.

DROP POLICY IF EXISTS "exercices_update"       ON public.exercices_budgetaires;
DROP POLICY IF EXISTS "exercices_update_admin" ON public.exercices_budgetaires;
CREATE POLICY "exercices_update" ON public.exercices_budgetaires
  FOR UPDATE
  USING (
    tenant_id = public.fn_get_tenant_id()
    AND public.fn_has_role(ARRAY['ORDONNATEUR', 'ADMIN_MINISTERE', 'SUPER_ADMIN'])
  );

-- Pas de policy DELETE → exercices clos restent en archive permanente.

COMMIT;
