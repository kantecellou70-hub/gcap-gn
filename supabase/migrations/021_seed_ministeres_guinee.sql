-- ============================================================
-- GCAP-GN — Seed des 27 ministères guinéens
-- Migration idempotente — ON CONFLICT (code) DO UPDATE
-- Colonnes réelles : code, nom, type, statut (migration 001)
-- ============================================================

INSERT INTO public.tenants (code, nom, type, statut)
VALUES

-- ── Institutions régaliennes ──────────────────────────────────────────────
('MJ',      'Ministère de la Justice et des Droits de l''Homme',                                                                              'MINISTERE', 'ACTIF'),
('MDN',     'Ministère de la Défense nationale',                                                                                              'MINISTERE', 'ACTIF'),
('MATD',    'Ministère de l''Administration du territoire et de la Décentralisation',                                                          'MINISTERE', 'ACTIF'),
('MSPC',    'Ministère de la Sécurité et de la Protection civile',                                                                            'MINISTERE', 'ACTIF'),
('MAECI',   'Ministère des Affaires étrangères, de la Coopération internationale, de l''Intégration africaine et des Guinéens de l''étranger', 'MINISTERE', 'ACTIF'),

-- ── Finances & Économie ───────────────────────────────────────────────────
('MEFP',    'Ministère de l''Economie, des Finances et du Plan',                                                                              'MINISTERE', 'ACTIF'),
('MB',      'Ministère du Budget',                                                                                                            'MINISTERE', 'ACTIF'),
('MTFP',    'Ministère du Travail et de la Fonction publique',                                                                                'MINISTERE', 'ACTIF'),

-- ── Environnement & Ressources naturelles ────────────────────────────────
('MEDD',    'Ministère de l''Environnement et du Développement Durable',                                                                      'MINISTERE', 'ACTIF'),
('MAE',     'Ministère de l''Agriculture et de l''Élevage',                                                                                   'MINISTERE', 'ACTIF'),
('MEHH',    'Ministère de l''Energie, de l''Hydraulique et des Hydrocarbures',                                                                 'MINISTERE', 'ACTIF'),
('MMG',     'Ministère des Mines et de la Géologie',                                                                                          'MINISTERE', 'ACTIF'),

-- ── Infrastructures & Numérique ──────────────────────────────────────────
('MIT',     'Ministère des Infrastructures et des Transports',                                                                                'MINISTERE', 'ACTIF'),
('MPTEN',   'Ministère des Postes, des Télécommunications et de l''Economie numérique',                                                        'MINISTERE', 'ACTIF'),
('MUHAT',   'Ministère de l''Urbanisme, de l''Habitat et de l''Aménagement du territoire',                                                     'MINISTERE', 'ACTIF'),

-- ── Secteurs productifs ───────────────────────────────────────────────────
('MPEM',    'Ministère de la Pêche et de l''Economie maritime',                                                                               'MINISTERE', 'ACTIF'),
('MCIPME',  'Ministère du Commerce, de l''Industrie et des Petites et Moyennes entreprises',                                                  'MINISTERE', 'ACTIF'),

-- ── Éducation & Formation ─────────────────────────────────────────────────
('MESRI',   'Ministère de l''Enseignement supérieur, de la Recherche scientifique et de l''Innovation',                                        'MINISTERE', 'ACTIF'),
('MEPA',    'Ministère de l''Enseignement pré-universitaire et de l''Alphabétisation',                                                         'MINISTERE', 'ACTIF'),
('METFP',   'Ministère de l''Enseignement technique et de la Formation professionnelle',                                                       'MINISTERE', 'ACTIF'),

-- ── Santé & Social ────────────────────────────────────────────────────────
('MSHP',    'Ministère de la Santé et de l''Hygiène publique',                                                                                'MINISTERE', 'ACTIF'),
('MCI',     'Ministère de la Communication et de l''Information',                                                                             'MINISTERE', 'ACTIF'),
('MJS',     'Ministère de la Jeunesse et des Sports',                                                                                         'MINISTERE', 'ACTIF'),
('MPFEPV',  'Ministère de la Promotion féminine, de l''Enfance et des Personnes vulnérables',                                                  'MINISTERE', 'ACTIF'),
('MCTA',    'Ministère de la Culture, du Tourisme et de l''Artisanat',                                                                        'MINISTERE', 'ACTIF'),

-- ── Secrétariats ──────────────────────────────────────────────────────────
('SGG',     'Secrétariat Général du Gouvernement',                                                                                            'DIRECTION', 'ACTIF'),
('SGAR',    'Secrétariat Général aux Affaires Religieuses',                                                                                   'DIRECTION', 'ACTIF')

ON CONFLICT (code) DO UPDATE
  SET nom    = EXCLUDED.nom,
      type   = EXCLUDED.type,
      statut = 'ACTIF';

-- ── Vérification ──────────────────────────────────────────────────────────
SELECT
  COUNT(*)                                                     AS nb_total,
  COUNT(*) FILTER (WHERE statut = 'ACTIF')                    AS nb_actifs,
  COUNT(*) FILTER (WHERE type = 'MINISTERE')                  AS nb_ministeres,
  COUNT(*) FILTER (WHERE type IN ('EPA', 'DIRECTION'))        AS nb_autres
FROM public.tenants;
