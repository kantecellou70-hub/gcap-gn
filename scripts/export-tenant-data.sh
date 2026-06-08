#!/usr/bin/env bash
# Export complet des données d'un tenant — GCAP-GN
# Usage : ./scripts/export-tenant-data.sh <TENANT_ID>
# Exporte toutes les tables du tenant en JSON + génère une signature SHA-256 par table.
# Prérequis :
#   - psql disponible dans le PATH
#   - SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD dans l'environnement ou .env.local
# Idempotent : chaque exécution crée un répertoire horodaté unique.
set -euo pipefail

# ─── Arguments ────────────────────────────────────────────────────────────────
TENANT_ID="${1:-}"
if [[ -z "$TENANT_ID" ]]; then
  echo "Usage : $0 <TENANT_ID>" >&2
  echo "  TENANT_ID : UUID du tenant à exporter (ex : f47ac10b-58cc-4372-a567-0e02b2c3d479)" >&2
  exit 1
fi

# Validation basique du format UUID
if ! [[ "$TENANT_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "ERREUR : TENANT_ID invalide (format UUID attendu)" >&2
  exit 1
fi

# ─── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
EXPORT_DIR="${EXPORT_DIR:-$PROJECT_ROOT/.exports}/tenant-${TENANT_ID:0:8}-$TIMESTAMP"
LOG_FILE="$EXPORT_DIR/export.log"

# Charger .env.local si présent
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$PROJECT_ROOT/.env.local" && set +a
fi

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"

# ─── Fonctions utilitaires ────────────────────────────────────────────────────
log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
error() { log "ERREUR: $*" >&2; exit 1; }

# ─── Vérifications préalables ─────────────────────────────────────────────────
mkdir -p "$EXPORT_DIR"
log "=== GCAP-GN Export tenant $TENANT_ID — $TIMESTAMP ==="

if [[ -z "$SUPABASE_PROJECT_REF" ]]; then
  error "SUPABASE_PROJECT_REF non défini."
fi
if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  error "SUPABASE_DB_PASSWORD non défini."
fi
if ! command -v psql &>/dev/null; then
  error "psql introuvable. Installez postgresql-client."
fi

DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
export PGPASSWORD="$SUPABASE_DB_PASSWORD"

# Fonction pour exporter une table filtrée par tenant_id en JSON
export_table() {
  local TABLE="$1"
  local OUT="$EXPORT_DIR/${TABLE}.json"

  log "Export : $TABLE → ${TABLE}.json"

  psql \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --tuples-only \
    --command="
      COPY (
        SELECT row_to_json(t)
        FROM (
          SELECT * FROM public.\"$TABLE\"
          WHERE tenant_id = '$TENANT_ID'
          ORDER BY created_at
        ) t
      ) TO STDOUT;
    " > "$OUT" 2>>"$LOG_FILE"

  local COUNT
  COUNT="$(wc -l < "$OUT")"
  local CHECKSUM
  CHECKSUM="$(sha256sum "$OUT" | awk '{print $1}')"
  echo "$CHECKSUM  ${TABLE}.json" >> "$EXPORT_DIR/checksums.sha256"
  log "  $COUNT lignes — SHA-256 : $CHECKSUM"
}

# Tables métier avec tenant_id
TABLES=(
  "tenants"
  "user_profiles"
  "exercices_budgetaires"
  "lignes_budgetaires"
  "engagements_depenses"
  "liquidations"
  "mandats_paiement"
  "recettes"
  "biens"
  "comptes_administratifs"
  "pieces_jointes"
  "notifications"
  "audit_logs"
)

# ─── Export des tables ─────────────────────────────────────────────────────────
log "Démarrage de l'export (${#TABLES[@]} tables)..."

for TABLE in "${TABLES[@]}"; do
  export_table "$TABLE" || {
    log "AVERTISSEMENT : impossible d'exporter '$TABLE' (table absente ou accès refusé)"
  }
done

# ─── Manifeste ────────────────────────────────────────────────────────────────
MANIFEST="$EXPORT_DIR/manifest.json"
cat > "$MANIFEST" <<EOF
{
  "gcap_gn_export": {
    "tenant_id": "$TENANT_ID",
    "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "host": "$DB_HOST",
    "tables": $(printf '%s\n' "${TABLES[@]}" | jq -R . | jq -sc .),
    "format": "json_lines",
    "encoding": "UTF-8",
    "legal_note": "Export conforme OHADA — conservation 10 ans minimale requise"
  }
}
EOF

log "Manifeste créé : manifest.json"

# Signature globale du manifeste
MANIFEST_SIG="$(sha256sum "$MANIFEST" | awk '{print $1}')"
echo "$MANIFEST_SIG  manifest.json" >> "$EXPORT_DIR/checksums.sha256"

# ─── Résumé ───────────────────────────────────────────────────────────────────
TOTAL_SIZE="$(du -sh "$EXPORT_DIR" | cut -f1)"
log ""
log "=== Export terminé avec succès ==="
log "  Répertoire : $EXPORT_DIR"
log "  Taille     : $TOTAL_SIZE"
log "  Checksums  : $EXPORT_DIR/checksums.sha256"
log "  Log        : $LOG_FILE"
log ""
log "Vérification de l'intégrité :"
log "  cd $EXPORT_DIR && sha256sum -c checksums.sha256"

unset PGPASSWORD
