-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 014 : Triggers notifications métier
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Trigger engagements ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_notif_engagement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_montant_mgnf TEXT;
BEGIN
  v_montant_mgnf := (NEW.montant_engage / 1000000)::TEXT || 'M GNF';

  -- Soumis au CF : notifier tous les CF du tenant
  IF NEW.statut = 'EN_ATTENTE_VISA'
     AND (OLD IS NULL OR OLD.statut <> 'EN_ATTENTE_VISA') THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'engagement_visa_requis',
      'Visa CF requis',
      NEW.numero || ' attend votre visa — ' || v_montant_mgnf,
      ARRAY['CF'],
      '/engagements/' || NEW.id::text,
      'normale',
      jsonb_build_object(
        'engagement_id', NEW.id,
        'montant',       NEW.montant_engage,
        'numero',        NEW.numero
      )
    );
  END IF;

  -- Visé par CF : notifier DAFF et SAFF
  IF NEW.statut = 'VISE' AND OLD.statut = 'EN_ATTENTE_VISA' THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'engagement_vise',
      'Engagement visé ✓',
      NEW.numero || ' a reçu le visa du Contrôleur Financier',
      ARRAY['DAFF', 'SAFF'],
      '/engagements/' || NEW.id::text,
      'normale',
      jsonb_build_object('engagement_id', NEW.id, 'numero', NEW.numero)
    );
  END IF;

  -- Rejeté par CF : notifier DAFF, SAFF, ORDONNATEUR
  IF NEW.statut = 'REJETE' AND OLD.statut = 'EN_ATTENTE_VISA' THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'engagement_rejete',
      'Engagement rejeté',
      NEW.numero || ' rejeté par le CF — ' ||
        COALESCE(NEW.motif_rejet, 'Motif non précisé'),
      ARRAY['DAFF', 'SAFF', 'ORDONNATEUR'],
      '/engagements/' || NEW.id::text,
      'urgente',
      jsonb_build_object(
        'engagement_id', NEW.id,
        'numero',        NEW.numero,
        'motif',         COALESCE(NEW.motif_rejet, 'Non précisé')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_engagement ON public.engagements_depenses;
CREATE TRIGGER trg_notif_engagement
  AFTER INSERT OR UPDATE OF statut ON public.engagements_depenses
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notif_engagement();

-- ─── Trigger mandats ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_notif_mandat()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mandat émis : notifier DAFF
  IF NEW.statut = 'EMIS'
     AND (OLD IS NULL OR OLD.statut <> 'EMIS') THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'mandat_emis',
      'Mandat émis au Trésor',
      NEW.numero || ' transmis au Trésor — ' ||
        (NEW.montant / 1000000)::TEXT || 'M GNF',
      ARRAY['DAFF'],
      '/ordonnancement/' || NEW.id::text,
      'normale',
      jsonb_build_object(
        'mandat_id', NEW.id,
        'numero',    NEW.numero,
        'montant',   NEW.montant
      )
    );
  END IF;

  -- Mandat rejeté par le Trésor : URGENT — notifier ORDONNATEUR + DAFF
  IF NEW.statut = 'REJETE_TRESOR'
     AND (OLD IS NULL OR OLD.statut <> 'REJETE_TRESOR') THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'mandat_rejete_tresor',
      'Mandat rejeté par le Trésor',
      NEW.numero || ' rejeté — action immédiate requise',
      ARRAY['ORDONNATEUR', 'DAFF'],
      '/ordonnancement/' || NEW.id::text,
      'urgente',
      jsonb_build_object(
        'mandat_id', NEW.id,
        'numero',    NEW.numero,
        'motif',     COALESCE(NEW.motif_rejet_tresor, 'Non précisé')
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_mandat ON public.mandats_paiement;
CREATE TRIGGER trg_notif_mandat
  AFTER INSERT OR UPDATE OF statut ON public.mandats_paiement
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notif_mandat();

-- ─── Trigger lignes budgétaires (seuil 90%) ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_notif_budget()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ratio_new NUMERIC;
  v_ratio_old NUMERIC;
  v_code      TEXT;
BEGIN
  IF NEW.credit_revise = 0 THEN RETURN NEW; END IF;

  v_ratio_new := NEW.montant_engage::NUMERIC / NEW.credit_revise::NUMERIC;
  v_ratio_old := OLD.montant_engage::NUMERIC / NULLIF(OLD.credit_revise::NUMERIC, 0);
  v_code      := NEW.code_titre || '.' || NEW.code_chapitre || '.' || NEW.code_article;

  -- Passe le seuil de 90% → alerte
  IF v_ratio_new >= 0.9
     AND (v_ratio_old IS NULL OR v_ratio_old < 0.9) THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'budget_seuil_90',
      'Alerte budget — 90% consommé',
      'Ligne ' || v_code || ' atteint ' ||
        ROUND(v_ratio_new * 100)::TEXT || '% de consommation',
      ARRAY['ORDONNATEUR', 'ADMIN_MINISTERE'],
      '/budget',
      'urgente',
      jsonb_build_object(
        'ligne_id',       NEW.id,
        'code',           v_code,
        'ratio',          ROUND(v_ratio_new * 100),
        'montant_engage', NEW.montant_engage,
        'credit_revise',  NEW.credit_revise
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_budget ON public.lignes_budgetaires;
CREATE TRIGGER trg_notif_budget
  AFTER UPDATE OF montant_engage ON public.lignes_budgetaires
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notif_budget();

COMMIT;
