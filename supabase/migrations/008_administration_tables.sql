-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 008 : Module Administration
-- user_profiles.actif + exercices enrichis + fournisseurs
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.exercices_budgetaires
  DROP CONSTRAINT IF EXISTS exercices_budgetaires_statut_check;
ALTER TABLE public.exercices_budgetaires
  ADD CONSTRAINT exercices_budgetaires_statut_check
  CHECK (statut IN ('OUVERT','APPROUVE','RECTIFIE','CLOTURE','ARCHIVE'));

CREATE TABLE IF NOT EXISTS public.fournisseurs (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES public.tenants(id),
  code           VARCHAR(20)  NOT NULL,
  denomination   VARCHAR(255) NOT NULL,
  nif            VARCHAR(50),
  rccm           VARCHAR(50),
  telephone      VARCHAR(20),
  email          VARCHAR(255),
  adresse        TEXT,
  banque         VARCHAR(200),
  numero_compte  VARCHAR(100),
  actif          BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_tenant ON public.fournisseurs(tenant_id);

ALTER TABLE public.fournisseurs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fournisseurs_tenant"  ON public.fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_insert"  ON public.fournisseurs;
DROP POLICY IF EXISTS "fournisseurs_update"  ON public.fournisseurs;
CREATE POLICY "fournisseurs_tenant"  ON public.fournisseurs USING          (tenant_id = public.fn_get_tenant_id());
CREATE POLICY "fournisseurs_insert"  ON public.fournisseurs FOR INSERT WITH CHECK (tenant_id = public.fn_get_tenant_id());
CREATE POLICY "fournisseurs_update"  ON public.fournisseurs FOR UPDATE USING (tenant_id = public.fn_get_tenant_id());
