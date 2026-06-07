#!/bin/bash
# GCAP-GN — Configuration du webhook Supabase pour les emails de notifications urgentes
# Usage : ./scripts/setup-webhook.sh
# Prérequis : SUPABASE_PROJECT_REF et SUPABASE_SERVICE_ROLE_KEY définis dans .env.local

set -euo pipefail

ENV_FILE="${1:-.env.local}"
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

echo "═══════════════════════════════════════════════════════"
echo "  GCAP-GN — Configuration Webhook Email Notifications"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ -z "$PROJECT_REF" ] || [ -z "$SERVICE_KEY" ]; then
  echo "⚠️  Variables manquantes dans $ENV_FILE :"
  echo "   SUPABASE_PROJECT_REF=<votre-project-ref>"
  echo "   SUPABASE_SERVICE_ROLE_KEY=<votre-service-role-key>"
  echo ""
fi

FUNCTION_URL="https://${PROJECT_REF:-YOUR_PROJECT_REF}.supabase.co/functions/v1/send-notification-email"

echo "📋 Étapes manuelles dans Supabase Dashboard"
echo "   Database → Webhooks → Create new webhook"
echo ""
echo "   Name     : send-urgent-notification-email"
echo "   Table    : notifications"
echo "   Events   : INSERT"
echo "   URL      : $FUNCTION_URL"
echo "   Method   : POST"
echo "   Headers  :"
echo "     Content-Type  : application/json"
echo "     Authorization : Bearer ${SERVICE_KEY:-YOUR_SERVICE_ROLE_KEY}"
echo ""
echo "📋 Secrets Edge Function"
echo "   Supabase Dashboard → Edge Functions → send-notification-email → Secrets"
echo ""
echo "   RESEND_API_KEY  = [obtenir sur resend.com/api-keys]"
echo "   APP_URL         = https://gcap-gn.vercel.app"
echo ""
echo "✅ Vérification après configuration"
echo "   Déclencher une notification urgente via SQL :"
echo ""
echo "   UPDATE mandats_paiement"
echo "   SET statut = 'REJETE_TRESOR'"
echo "   WHERE id = '<uuid-mandat>';"
echo ""
echo "   → Toast rouge 8s dans l'app + email envoyé au DAFF/ORDONNATEUR"
echo ""
echo "═══════════════════════════════════════════════════════"
