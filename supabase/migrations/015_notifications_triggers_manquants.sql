-- ═══════════════════════════════════════════════════════════
-- GCAP-GN — Migration 015 : Triggers notifications manquants
-- Correctif post-audit : liquidation_prete + exercice_cloture
-- LYNXA SARL — Juin 2026
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ─── Trigger liquidations (liquidation_prete) ─────────────────────────────────
-- Déclenché quand une liquidation passe au statut VALIDEE
-- → Notifie l'ORDONNATEUR qu'elle est prête pour ordonnancement

CREATE OR REPLACE FUNCTION public.trigger_notif_liquidation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'VALIDEE'
     AND (OLD IS NULL OR OLD.statut <> 'VALIDEE') THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'liquidation_prete',
      'Liquidation prête',
      'Liquidation ' || NEW.numero || ' validée — en attente d''ordonnancement',
      ARRAY['ORDONNATEUR'],
      '/liquidations/' || NEW.id::text,
      'normale',
      jsonb_build_object(
        'liquidation_id', NEW.id,
        'numero',         NEW.numero,
        'montant_net',    NEW.montant_net
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_liquidation ON public.liquidations;
CREATE TRIGGER trg_notif_liquidation
  AFTER INSERT OR UPDATE OF statut ON public.liquidations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notif_liquidation();

-- ─── Trigger exercices budgétaires (exercice_cloture) ────────────────────────
-- Déclenché quand un exercice passe au statut CLOTURE
-- → Notifie tous les rôles actifs du tenant

CREATE OR REPLACE FUNCTION public.trigger_notif_exercice()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'CLOTURE'
     AND (OLD IS NULL OR OLD.statut <> 'CLOTURE') THEN
    PERFORM public.dispatch_notification(
      NEW.tenant_id,
      'exercice_cloture',
      'Exercice budgétaire clôturé',
      'L''exercice budgétaire ' || NEW.annee::text || ' a été clôturé.',
      ARRAY[
        'SUPER_ADMIN', 'ADMIN_MINISTERE', 'ORDONNATEUR',
        'DAFF', 'SAFF', 'CF', 'COMPTABLE_MATIERES', 'AUDITEUR'
      ],
      '/comptes-admin',
      'normale',
      jsonb_build_object('exercice_id', NEW.id, 'annee', NEW.annee)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notif_exercice ON public.exercices_budgetaires;
CREATE TRIGGER trg_notif_exercice
  AFTER UPDATE OF statut ON public.exercices_budgetaires
  FOR EACH ROW EXECUTE FUNCTION public.trigger_notif_exercice();

-- ─── Vérification finale ──────────────────────────────────────────────────────

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.triggers
  WHERE trigger_name LIKE 'trg_notif_%';

  IF v_count < 5 THEN
    RAISE EXCEPTION 'Triggers manquants : % sur 5 attendus', v_count;
  END IF;

  RAISE NOTICE '✅ % triggers de notification actifs', v_count;
END;
$$;

COMMIT;
