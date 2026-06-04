BEGIN;

-- ─── Table de référence nationale des nomenclatures budgétaires ───────────────
-- tenant_id NULL = nomenclature nationale partagée (visible par tous)
-- tenant_id non NULL = nomenclature spécifique à un tenant

CREATE TABLE IF NOT EXISTS public.nomenclature_budgetaire (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        REFERENCES public.tenants(id),

  code_titre         VARCHAR(2)  NOT NULL,
  libelle_titre      TEXT        NOT NULL,
  code_chapitre      VARCHAR(4)  NOT NULL,
  libelle_chapitre   TEXT        NOT NULL,
  code_article       VARCHAR(6)  NOT NULL,
  libelle_article    TEXT        NOT NULL,
  code_paragraphe    VARCHAR(8),
  libelle_paragraphe TEXT,
  type_credit        TEXT        NOT NULL CHECK (
    type_credit IN ('FONCTIONNEMENT', 'INVESTISSEMENT', 'TRANSFERT')
  ),
  actif              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nomenclature_article_paragraphe
  ON public.nomenclature_budgetaire (code_article, COALESCE(code_paragraphe, ''));

CREATE INDEX IF NOT EXISTS idx_nomenclature_code_article
  ON public.nomenclature_budgetaire (code_article);
CREATE INDEX IF NOT EXISTS idx_nomenclature_type_credit
  ON public.nomenclature_budgetaire (type_credit);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.nomenclature_budgetaire ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié voit nationale + son tenant
CREATE POLICY nomenclature_select ON public.nomenclature_budgetaire
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id = (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

-- Écriture : SUPER_ADMIN uniquement
CREATE POLICY nomenclature_insert ON public.nomenclature_budgetaire
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY nomenclature_update ON public.nomenclature_budgetaire
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN'
    )
  );

-- ─── Seed — Nomenclature guinéenne de base ────────────────────────────────────

INSERT INTO public.nomenclature_budgetaire
  (code_titre, libelle_titre, code_chapitre, libelle_chapitre,
   code_article, libelle_article, type_credit)
VALUES
  -- Titre 2 — Personnel
  ('02','Dépenses de personnel','0201','Rémunérations du personnel',
   '020101','Salaires et indemnités de base','FONCTIONNEMENT'),
  ('02','Dépenses de personnel','0201','Rémunérations du personnel',
   '020102','Primes et avantages','FONCTIONNEMENT'),
  ('02','Dépenses de personnel','0202','Charges sociales',
   '020201','Cotisations patronales CNSS','FONCTIONNEMENT'),

  -- Titre 3 — Biens et services
  ('03','Biens et services','0301','Achats de fournitures',
   '030101','Fournitures de bureau','FONCTIONNEMENT'),
  ('03','Biens et services','0301','Achats de fournitures',
   '030102','Fournitures informatiques','FONCTIONNEMENT'),
  ('03','Biens et services','0302','Services extérieurs',
   '030201','Prestations de services','FONCTIONNEMENT'),
  ('03','Biens et services','0302','Services extérieurs',
   '030202','Locations','FONCTIONNEMENT'),
  ('03','Biens et services','0303','Frais de déplacement',
   '030301','Missions intérieures','FONCTIONNEMENT'),
  ('03','Biens et services','0303','Frais de déplacement',
   '030302','Missions extérieures','FONCTIONNEMENT'),
  ('03','Biens et services','0304','Énergie et eau',
   '030401','Électricité','FONCTIONNEMENT'),
  ('03','Biens et services','0304','Énergie et eau',
   '030402','Eau et assainissement','FONCTIONNEMENT'),
  ('03','Biens et services','0305','Télécommunications',
   '030501','Téléphone et internet','FONCTIONNEMENT'),

  -- Titre 4 — Transferts
  ('04','Transferts et subventions','0401','Subventions aux EPA',
   '040101','Subventions de fonctionnement','TRANSFERT'),
  ('04','Transferts et subventions','0401','Subventions aux EPA',
   '040102','Subventions d''investissement','TRANSFERT'),
  ('04','Transferts et subventions','0402','Bourses et aides sociales',
   '040201','Bourses d''études','TRANSFERT'),

  -- Titre 5 — Investissements
  ('05','Investissements de l''État','0501','Constructions et travaux',
   '050101','Bâtiments administratifs','INVESTISSEMENT'),
  ('05','Investissements de l''État','0502','Acquisition d''équipements',
   '050201','Matériel informatique','INVESTISSEMENT'),
  ('05','Investissements de l''État','0502','Acquisition d''équipements',
   '050202','Mobilier de bureau','INVESTISSEMENT'),
  ('05','Investissements de l''État','0502','Acquisition d''équipements',
   '050203','Véhicules administratifs','INVESTISSEMENT')
ON CONFLICT DO NOTHING;

-- ─── FK sur lignes_budgetaires ────────────────────────────────────────────────

ALTER TABLE public.lignes_budgetaires
  ADD COLUMN IF NOT EXISTS nomenclature_id UUID
  REFERENCES public.nomenclature_budgetaire(id);

COMMIT;
