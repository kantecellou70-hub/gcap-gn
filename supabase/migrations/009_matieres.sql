BEGIN;

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE etat_bien AS ENUM (
    'BON', 'ACCEPTABLE', 'MEDIOCRE', 'HORS_SERVICE', 'REFORME'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE categorie_bien AS ENUM (
    'MOBILIER', 'INFORMATIQUE', 'VEHICULE',
    'EQUIPEMENT_BUREAU', 'MATERIEL_TECHNIQUE', 'IMMEUBLE', 'AUTRE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table biens ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.biens (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code_inventaire    TEXT        NOT NULL,
  tenant_id          UUID        NOT NULL REFERENCES public.tenants(id),
  designation        TEXT        NOT NULL,
  categorie          categorie_bien NOT NULL,
  marque             TEXT,
  modele             TEXT,
  numero_serie       TEXT,
  valeur_acquisition BIGINT      NOT NULL CHECK (valeur_acquisition >= 0),
  date_acquisition   DATE        NOT NULL,
  engagement_id      UUID        REFERENCES public.engagements_depenses(id),
  localisation       TEXT        NOT NULL,
  affecte_a          UUID        REFERENCES public.user_profiles(id),
  etat               etat_bien   NOT NULL DEFAULT 'BON',
  actif              BOOLEAN     NOT NULL DEFAULT TRUE,
  sicom_id           TEXT,
  sicom_sync_at      TIMESTAMPTZ,
  observations       TEXT,
  created_by         UUID        NOT NULL REFERENCES public.user_profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code_inventaire)
);

-- ─── Auto-numérotation code inventaire ───────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_code_inventaire()
RETURNS TRIGGER AS $$
DECLARE
  annee      TEXT := TO_CHAR(NOW(), 'YYYY');
  code_tenant TEXT;
  seq        INTEGER;
BEGIN
  IF NEW.code_inventaire IS NOT NULL AND NEW.code_inventaire <> '' THEN
    RETURN NEW;
  END IF;
  SELECT code INTO code_tenant FROM public.tenants WHERE id = NEW.tenant_id;
  SELECT COUNT(*) + 1 INTO seq FROM public.biens WHERE tenant_id = NEW.tenant_id;
  NEW.code_inventaire := 'INV-' || annee || '-' || code_tenant
                         || '-' || LPAD(seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_code_inventaire ON public.biens;
CREATE TRIGGER trg_code_inventaire
BEFORE INSERT ON public.biens
FOR EACH ROW
EXECUTE FUNCTION fn_code_inventaire();

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_biens_updated_at ON public.biens;
CREATE TRIGGER trg_biens_updated_at
BEFORE UPDATE ON public.biens
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();

-- ─── Index ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_biens_tenant      ON public.biens (tenant_id);
CREATE INDEX IF NOT EXISTS idx_biens_etat        ON public.biens (tenant_id, etat);
CREATE INDEX IF NOT EXISTS idx_biens_categorie   ON public.biens (tenant_id, categorie);
CREATE INDEX IF NOT EXISTS idx_biens_actif       ON public.biens (tenant_id, actif);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.biens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS biens_tenant_select ON public.biens;
CREATE POLICY biens_tenant_select ON public.biens
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS biens_tenant_insert ON public.biens;
CREATE POLICY biens_tenant_insert ON public.biens
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('COMPTABLE_MATIERES', 'ADMIN_MINISTERE', 'SUPER_ADMIN')
    )
  );

DROP POLICY IF EXISTS biens_tenant_update ON public.biens;
CREATE POLICY biens_tenant_update ON public.biens
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('COMPTABLE_MATIERES', 'ADMIN_MINISTERE', 'SUPER_ADMIN')
    )
  );

-- Pas de DELETE — réforme = UPDATE etat='REFORME', actif=false

COMMIT;
