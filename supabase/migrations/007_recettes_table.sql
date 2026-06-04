-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 007 : Table recettes non fiscales
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recettes (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES public.tenants(id),
  exercice_id         UUID        NOT NULL REFERENCES public.exercices_budgetaires(id),
  ligne_budgetaire_id UUID        REFERENCES public.lignes_budgetaires(id),
  numero              VARCHAR(50),
  type_recette        VARCHAR(30) NOT NULL
    CHECK (type_recette IN ('REDEVANCE','VENTE_SERVICE','REMBOURSEMENT','DON','AUTRE')),
  libelle             VARCHAR(255) NOT NULL,
  montant_prevu       INTEGER     NOT NULL CHECK (montant_prevu > 0),
  montant_constate    INTEGER     NOT NULL DEFAULT 0 CHECK (montant_constate >= 0),
  montant_recouvre    INTEGER     NOT NULL DEFAULT 0 CHECK (montant_recouvre >= 0),
  debiteur            VARCHAR(255) NOT NULL,
  date_constatation   DATE,
  observations        TEXT,
  statut              VARCHAR(20) NOT NULL DEFAULT 'PREVUE'
    CHECK (statut IN ('PREVUE','CONSTATEE','RECOUVREE','ANNULEE')),
  created_by          UUID        REFERENCES public.user_profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recettes_tenant   ON public.recettes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recettes_exercice ON public.recettes(exercice_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_recettes_statut   ON public.recettes(tenant_id, statut);

ALTER TABLE public.recettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recettes_tenant_isolation" ON public.recettes
  USING (tenant_id = public.fn_get_tenant_id());

CREATE OR REPLACE FUNCTION fn_numero_recette()
RETURNS TRIGGER AS $$
DECLARE
  v_code  VARCHAR(20);
  v_annee INTEGER;
  v_seq   INTEGER;
BEGIN
  SELECT t.code INTO v_code FROM tenants t WHERE t.id = NEW.tenant_id;
  SELECT EXTRACT(YEAR FROM NOW())::INTEGER INTO v_annee;
  SELECT COUNT(*) + 1 INTO v_seq
  FROM recettes
  WHERE tenant_id = NEW.tenant_id
    AND EXTRACT(YEAR FROM created_at) = v_annee;
  NEW.numero := FORMAT('REC-%s-%s-%s', v_annee, v_code, LPAD(v_seq::TEXT, 5, '0'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_numero_recette ON public.recettes;
CREATE TRIGGER trg_numero_recette
  BEFORE INSERT ON public.recettes
  FOR EACH ROW
  WHEN (NEW.numero IS NULL OR NEW.numero = '')
  EXECUTE FUNCTION fn_numero_recette();
