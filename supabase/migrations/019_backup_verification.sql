BEGIN;

-- Vue v_backup_health : tableau de bord de santé des sauvegardes
-- Accès restreint : super_admin uniquement (role postgres en production)
-- Utilisée par HealthPage et les scripts de monitoring LYNXA.

CREATE OR REPLACE VIEW public.v_backup_health AS
SELECT
  -- Horodatage de la vérification
  NOW()                                                         AS checked_at,

  -- Compteurs globaux
  (SELECT COUNT(*)  FROM public.tenants)                        AS tenants_total,
  (SELECT COUNT(*)  FROM public.tenants WHERE statut = 'ACTIF') AS tenants_actifs,

  -- Intégrité des engagements
  (SELECT COUNT(*)  FROM public.engagements_depenses)           AS engagements_total,
  (SELECT COUNT(*)
   FROM public.engagements_depenses
   WHERE tenant_id IS NULL)                                     AS engagements_sans_tenant,

  -- Intégrité des lignes budgétaires (dépassement = montant engagé > crédit révisé)
  (SELECT COUNT(*)
   FROM public.lignes_budgetaires
   WHERE montant_engage > credit_revise)                        AS lignes_en_depassement,

  -- Volume du journal d'audit (proxy de la santé de l'immuabilité)
  (SELECT COUNT(*)  FROM public.audit_log)                      AS audit_logs_total,
  (SELECT MAX(created_at) FROM public.audit_log)                AS audit_dernier_log,

  -- Pièces jointes orphelines (table non encore créée → 0)
  0::BIGINT                                                     AS pieces_jointes_orphelines,

  -- Dernière migration connue (mise à jour manuellement à chaque migration)
  19                                                            AS migrations_attendues,

  -- Cohérence multi-tenant : engagements dont le tenant_id ne correspond
  -- à aucun tenant actif (données orphelines post-suppression tenant)
  (SELECT COUNT(*)
   FROM public.engagements_depenses ed
   WHERE NOT EXISTS (
     SELECT 1 FROM public.tenants t
     WHERE t.id = ed.tenant_id
   ))                                                           AS engagements_tenant_invalide;

-- Révoquer l'accès public par défaut
REVOKE ALL ON public.v_backup_health FROM PUBLIC;
REVOKE ALL ON public.v_backup_health FROM anon;
REVOKE ALL ON public.v_backup_health FROM authenticated;

-- Seul le rôle postgres (super_admin Supabase) peut lire cette vue
-- En pratique : accessible uniquement depuis l'Edge Function d'audit LYNXA
-- ou via la CLI Supabase avec le service_role_key (jamais exposé côté frontend)
GRANT SELECT ON public.v_backup_health TO postgres;

COMMENT ON VIEW public.v_backup_health IS
  'Tableau de bord de santé des données GCAP-GN. '
  'Accès restreint au rôle postgres (super_admin). '
  'Mise à jour : migrations_attendues doit être incrémenté à chaque nouvelle migration.';

COMMIT;
