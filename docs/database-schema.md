# Schéma Base de Données — GCAP-GN

## Principe général

- Toutes les tables principales ont une colonne `tenant_id UUID NOT NULL`
- Row Level Security (RLS) activé sur **TOUTES** les tables
- Les migrations sont dans `supabase/migrations/` numérotées 001, 002, etc.
- Tous les montants en `INTEGER` (Francs Guinéens — pas de décimales)

## Tables principales

### `tenants` — liste des ministères / EPA

```sql
id         UUID        PRIMARY KEY DEFAULT gen_random_uuid()
code       VARCHAR(20) UNIQUE NOT NULL      -- ex: 'MEFB', 'MSANTE', 'MEDUCATION'
nom        VARCHAR(200) NOT NULL            -- ex: 'Ministère de la Santé'
type       VARCHAR(20) NOT NULL             -- MINISTERE | EPA | DIRECTION
statut     VARCHAR(20) DEFAULT 'ACTIF'     -- ACTIF | SUSPENDU
created_at TIMESTAMPTZ DEFAULT now()
```

### `user_profiles` — extension de auth.users Supabase

```sql
id         UUID        PRIMARY KEY REFERENCES auth.users(id)
tenant_id  UUID        NOT NULL REFERENCES tenants(id)
nom        VARCHAR(100) NOT NULL
prenom     VARCHAR(100) NOT NULL
matricule  VARCHAR(50)                      -- Numéro de matricule fonctionnaire
poste      VARCHAR(200)
telephone  VARCHAR(20)
created_at TIMESTAMPTZ DEFAULT now()
```

### `user_roles`

```sql
id         UUID        PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID        NOT NULL REFERENCES user_profiles(id)
tenant_id  UUID        NOT NULL REFERENCES tenants(id)
role       VARCHAR(30) NOT NULL             -- Voir docs/roles-permissions.md
actif      BOOLEAN     DEFAULT true
created_at TIMESTAMPTZ DEFAULT now()

UNIQUE(user_id, tenant_id, role)
```

### `exercices_budgetaires`

```sql
id             UUID        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id      UUID        NOT NULL REFERENCES tenants(id)
annee          INTEGER     NOT NULL           -- ex: 2026
statut         VARCHAR(20) DEFAULT 'OUVERT'  -- OUVERT | CLOTURE | ARCHIVE
date_ouverture DATE        NOT NULL
date_cloture   DATE
created_at     TIMESTAMPTZ DEFAULT now()

UNIQUE(tenant_id, annee)
```

### `lignes_budgetaires`

```sql
id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id          UUID        NOT NULL REFERENCES tenants(id)
exercice_id        UUID        NOT NULL REFERENCES exercices_budgetaires(id)
code_titre         VARCHAR(5)  NOT NULL         -- Niveau 1 nomenclature
code_chapitre      VARCHAR(10) NOT NULL          -- Niveau 2
code_article       VARCHAR(15) NOT NULL          -- Niveau 3
code_paragraphe    VARCHAR(20)                   -- Niveau 4 (optionnel)
libelle            VARCHAR(500) NOT NULL
credit_initial     INTEGER     NOT NULL DEFAULT 0  -- En GNF (INTEGER, jamais DECIMAL)
credit_revise      INTEGER     NOT NULL DEFAULT 0
montant_engage     INTEGER     NOT NULL DEFAULT 0
montant_liquide    INTEGER     NOT NULL DEFAULT 0
montant_ordonnance INTEGER     NOT NULL DEFAULT 0
created_at         TIMESTAMPTZ DEFAULT now()
```

> **Crédit disponible** = `credit_revise - montant_engage`
> Vérification obligatoire avant tout engagement.

### `engagements_depenses`

```sql
id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id           UUID        NOT NULL REFERENCES tenants(id)
numero              VARCHAR(50) UNIQUE NOT NULL  -- Numéro officiel engagement
exercice_id         UUID        NOT NULL REFERENCES exercices_budgetaires(id)
ligne_budgetaire_id UUID        NOT NULL REFERENCES lignes_budgetaires(id)
objet               TEXT        NOT NULL
fournisseur         VARCHAR(300)
reference_marche    VARCHAR(100)
montant_engage      INTEGER     NOT NULL         -- En GNF

statut VARCHAR(30) NOT NULL DEFAULT 'BROUILLON'
-- BROUILLON | EN_ATTENTE_VISA | VISE | REJETE | LIQUIDE | ORDONNANCE | ANNULE

date_creation       TIMESTAMPTZ DEFAULT now()
created_by          UUID        NOT NULL REFERENCES user_profiles(id)
date_visa_cf        TIMESTAMPTZ
vise_par            UUID        REFERENCES user_profiles(id)
motif_rejet         TEXT
pieces_jointes      JSONB       DEFAULT '[]'     -- [{nom, url, taille, type}]
metadata            JSONB       DEFAULT '{}'
```

### `liquidations`

```sql
id                UUID        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id         UUID        NOT NULL REFERENCES tenants(id)
engagement_id     UUID        NOT NULL REFERENCES engagements_depenses(id)
numero            VARCHAR(50) UNIQUE NOT NULL
montant_liquide   INTEGER     NOT NULL
date_service_fait DATE        NOT NULL          -- Date du PVSF
reference_pvsf    VARCHAR(100)
montant_deductions INTEGER    DEFAULT 0         -- Retenues, pénalités
montant_net       INTEGER     NOT NULL          -- = montant_liquide - deductions
statut            VARCHAR(20) DEFAULT 'EN_COURS'
created_by        UUID        NOT NULL REFERENCES user_profiles(id)
created_at        TIMESTAMPTZ DEFAULT now()
pieces_jointes    JSONB       DEFAULT '[]'
```

### `mandats_paiement`

```sql
id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id                 UUID        NOT NULL REFERENCES tenants(id)
liquidation_id            UUID        NOT NULL REFERENCES liquidations(id)
numero                    VARCHAR(50) UNIQUE NOT NULL  -- Numéro mandat officiel
montant                   INTEGER     NOT NULL
mode_paiement             VARCHAR(30) NOT NULL   -- VIREMENT | CHEQUE | CAISSE
beneficiaire              VARCHAR(300) NOT NULL
rib                       VARCHAR(100)           -- RIB si virement

statut VARCHAR(30) DEFAULT 'EMIS'
-- EMIS | TRANSMIS_TRESOR | PRIS_EN_CHARGE | PAYE | REJETE

date_emission             TIMESTAMPTZ DEFAULT now()
emis_par                  UUID        NOT NULL REFERENCES user_profiles(id)
date_transmission_tresor  TIMESTAMPTZ
motif_rejet_tresor        TEXT
```

### `audit_log` — piste d'audit immuable

```sql
id         UUID        PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id  UUID        NOT NULL
user_id    UUID        NOT NULL
action     VARCHAR(100) NOT NULL       -- ex: 'ENGAGEMENT_VISE', 'MANDAT_EMIS'
table_name VARCHAR(100) NOT NULL
record_id  UUID        NOT NULL
old_values JSONB
new_values JSONB
ip_address INET
user_agent TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

> `audit_log` est en **append-only** — aucune UPDATE ni DELETE autorisée via RLS.

## Contraintes d'intégrité métier

```sql
-- Séparation des fonctions : interdire SAFF + DAFF simultanément
ALTER TABLE user_roles ADD CONSTRAINT check_role_separation
  CHECK (role NOT IN ('SAFF', 'DAFF') OR
    NOT EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = user_id
        AND ur2.tenant_id = tenant_id
        AND ur2.role IN ('SAFF', 'DAFF')
        AND ur2.id != id
    )
  );
```

## Index recommandés

```sql
CREATE INDEX idx_engagements_tenant_statut   ON engagements_depenses(tenant_id, statut);
CREATE INDEX idx_engagements_exercice        ON engagements_depenses(exercice_id);
CREATE INDEX idx_lignes_tenant_exercice      ON lignes_budgetaires(tenant_id, exercice_id);
CREATE INDEX idx_audit_log_tenant_record     ON audit_log(tenant_id, record_id);
CREATE INDEX idx_audit_log_created_at        ON audit_log(created_at DESC);
```
