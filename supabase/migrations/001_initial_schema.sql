-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 001 : Schéma initial
-- République de Guinée — Comptabilité Administrative Publique
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- ─── TENANTS (Ministères / EPA) ──────────────────────────────────────────────

CREATE TABLE tenants (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code       VARCHAR(20) UNIQUE NOT NULL,
  nom        VARCHAR(200) NOT NULL,
  type       VARCHAR(20) NOT NULL CHECK (type IN ('MINISTERE', 'EPA', 'DIRECTION')),
  statut     VARCHAR(20) NOT NULL DEFAULT 'ACTIF' CHECK (statut IN ('ACTIF', 'SUSPENDU')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── PROFILS UTILISATEURS ────────────────────────────────────────────────────

CREATE TABLE user_profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id),
  nom        VARCHAR(100) NOT NULL,
  prenom     VARCHAR(100) NOT NULL,
  matricule  VARCHAR(50),
  poste      VARCHAR(200),
  telephone  VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── RÔLES ───────────────────────────────────────────────────────────────────

CREATE TABLE user_roles (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  tenant_id  UUID        NOT NULL REFERENCES tenants(id),
  role       VARCHAR(30) NOT NULL CHECK (role IN (
    'SUPER_ADMIN', 'ADMIN_MINISTERE', 'ORDONNATEUR',
    'DAFF', 'SAFF', 'CF', 'COMPTABLE_MATIERES', 'AUDITEUR', 'GESTIONNAIRE_BUDGET'
  )),
  actif      BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, role)
);

-- ─── EXERCICES BUDGÉTAIRES ───────────────────────────────────────────────────

CREATE TABLE exercices_budgetaires (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id),
  annee          INTEGER     NOT NULL CHECK (annee >= 2020 AND annee <= 2100),
  statut         VARCHAR(20) NOT NULL DEFAULT 'OUVERT' CHECK (statut IN ('OUVERT', 'CLOTURE', 'ARCHIVE')),
  date_ouverture DATE        NOT NULL,
  date_cloture   DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, annee)
);

-- ─── LIGNES BUDGÉTAIRES ──────────────────────────────────────────────────────

CREATE TABLE lignes_budgetaires (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES tenants(id),
  exercice_id        UUID        NOT NULL REFERENCES exercices_budgetaires(id),
  code_titre         VARCHAR(5)  NOT NULL,
  code_chapitre      VARCHAR(10) NOT NULL,
  code_article       VARCHAR(15) NOT NULL,
  code_paragraphe    VARCHAR(20),
  libelle            VARCHAR(500) NOT NULL,
  credit_initial     INTEGER     NOT NULL DEFAULT 0 CHECK (credit_initial >= 0),
  credit_revise      INTEGER     NOT NULL DEFAULT 0 CHECK (credit_revise >= 0),
  montant_engage     INTEGER     NOT NULL DEFAULT 0 CHECK (montant_engage >= 0),
  montant_liquide    INTEGER     NOT NULL DEFAULT 0 CHECK (montant_liquide >= 0),
  montant_ordonnance INTEGER     NOT NULL DEFAULT 0 CHECK (montant_ordonnance >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── ENGAGEMENTS DE DÉPENSES ─────────────────────────────────────────────────

CREATE TABLE engagements_depenses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES tenants(id),
  numero              VARCHAR(50) UNIQUE NOT NULL,
  exercice_id         UUID        NOT NULL REFERENCES exercices_budgetaires(id),
  ligne_budgetaire_id UUID        NOT NULL REFERENCES lignes_budgetaires(id),
  objet               TEXT        NOT NULL,
  fournisseur         VARCHAR(300),
  reference_marche    VARCHAR(100),
  montant_engage      INTEGER     NOT NULL CHECK (montant_engage > 0),
  statut              VARCHAR(30) NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN (
    'BROUILLON', 'EN_ATTENTE_VISA', 'VISE', 'REJETE', 'LIQUIDE', 'ORDONNANCE', 'ANNULE'
  )),
  date_creation       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID        NOT NULL REFERENCES user_profiles(id),
  date_visa_cf        TIMESTAMPTZ,
  vise_par            UUID        REFERENCES user_profiles(id),
  motif_rejet         TEXT,
  pieces_jointes      JSONB       NOT NULL DEFAULT '[]',
  metadata            JSONB       NOT NULL DEFAULT '{}'
);

-- ─── LIQUIDATIONS ────────────────────────────────────────────────────────────

CREATE TABLE liquidations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES tenants(id),
  engagement_id      UUID        NOT NULL REFERENCES engagements_depenses(id),
  numero             VARCHAR(50) UNIQUE NOT NULL,
  montant_liquide    INTEGER     NOT NULL CHECK (montant_liquide > 0),
  date_service_fait  DATE        NOT NULL,
  reference_pvsf     VARCHAR(100),
  montant_deductions INTEGER     NOT NULL DEFAULT 0 CHECK (montant_deductions >= 0),
  montant_net        INTEGER     NOT NULL CHECK (montant_net > 0),
  statut             VARCHAR(20) NOT NULL DEFAULT 'EN_COURS' CHECK (statut IN ('EN_COURS', 'VALIDEE', 'ANNULEE')),
  created_by         UUID        NOT NULL REFERENCES user_profiles(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  pieces_jointes     JSONB       NOT NULL DEFAULT '[]'
);

-- ─── MANDATS DE PAIEMENT ─────────────────────────────────────────────────────

CREATE TABLE mandats_paiement (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID        NOT NULL REFERENCES tenants(id),
  liquidation_id           UUID        NOT NULL REFERENCES liquidations(id),
  numero                   VARCHAR(50) UNIQUE NOT NULL,
  montant                  INTEGER     NOT NULL CHECK (montant > 0),
  mode_paiement            VARCHAR(30) NOT NULL CHECK (mode_paiement IN ('VIREMENT', 'CHEQUE', 'CAISSE')),
  beneficiaire             VARCHAR(300) NOT NULL,
  rib                      VARCHAR(100),
  statut                   VARCHAR(30) NOT NULL DEFAULT 'EMIS' CHECK (statut IN (
    'EMIS', 'TRANSMIS_TRESOR', 'PRIS_EN_CHARGE', 'PAYE', 'REJETE'
  )),
  date_emission            TIMESTAMPTZ NOT NULL DEFAULT now(),
  emis_par                 UUID        NOT NULL REFERENCES user_profiles(id),
  date_transmission_tresor TIMESTAMPTZ,
  motif_rejet_tresor       TEXT
);

-- ─── AUDIT LOG (immuable) ────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID         NOT NULL,
  user_id    UUID         NOT NULL,
  action     VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id  UUID         NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Pas de DELETE ni UPDATE sur audit_log
CREATE RULE no_delete_audit AS ON DELETE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_update_audit AS ON UPDATE TO audit_log DO INSTEAD NOTHING;

-- ─── INDEX DE PERFORMANCE ────────────────────────────────────────────────────

CREATE INDEX idx_engagements_tenant   ON engagements_depenses(tenant_id);
CREATE INDEX idx_engagements_statut   ON engagements_depenses(tenant_id, statut);
CREATE INDEX idx_engagements_exercice ON engagements_depenses(exercice_id);
CREATE INDEX idx_liquidations_tenant  ON liquidations(tenant_id);
CREATE INDEX idx_mandats_tenant       ON mandats_paiement(tenant_id);
CREATE INDEX idx_lignes_exercice      ON lignes_budgetaires(exercice_id, tenant_id);
CREATE INDEX idx_audit_tenant_date    ON audit_log(tenant_id, created_at DESC);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────

ALTER TABLE tenants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercices_budgetaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE lignes_budgetaires    ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements_depenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandats_paiement      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

-- Politique RLS : chaque utilisateur ne voit que les données de son tenant
-- (policies complètes par rôle dans la migration 002)

CREATE POLICY "tenant_isolation" ON engagements_depenses
  USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_isolation" ON liquidations
  USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_isolation" ON mandats_paiement
  USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

CREATE POLICY "tenant_isolation" ON lignes_budgetaires
  USING (tenant_id = (
    SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ─── DONNÉES DE RÉFÉRENCE ────────────────────────────────────────────────────

-- Tenants de démonstration
INSERT INTO tenants (code, nom, type) VALUES
  ('MEFB',       'Ministère de l''Économie, des Finances et du Budget', 'MINISTERE'),
  ('MSANTE',     'Ministère de la Santé',                               'MINISTERE'),
  ('MEDUCATION', 'Ministère de l''Éducation Nationale',                 'MINISTERE'),
  ('DEMO',       'Tenant de Démonstration',                             'EPA');
