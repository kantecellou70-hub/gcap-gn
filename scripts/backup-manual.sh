#!/usr/bin/env bash
# Sauvegarde manuelle GCAP-GN — via Supabase CLI
# Usage : ./scripts/backup-manual.sh
# Prérequis :
#   - supabase CLI installé (https://supabase.com/docs/guides/cli)
#   - SUPABASE_PROJECT_REF dans l'environnement ou .env.local
#   - SUPABASE_DB_PASSWORD dans l'environnement ou .env.local
#   - pg_dump disponible dans le PATH
# Idempotent : chaque exécution crée un fichier horodaté unique.
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/.backups}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/gcap-gn-backup-$TIMESTAMP.dump"
LOG_FILE="$BACKUP_DIR/gcap-gn-backup-$TIMESTAMP.log"

# Charger les variables d'environnement si .env.local existe
if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
  # shellcheck disable=SC1091
  set -a && source "$PROJECT_ROOT/.env.local" && set +a
fi

# Variables requises
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
SUPABASE_REGION="${SUPABASE_REGION:-eu-west-3}"

# ─── Fonctions utilitaires ────────────────────────────────────────────────────
log() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
error() { log "ERREUR: $*" >&2; exit 1; }

# ─── Vérifications préalables ─────────────────────────────────────────────────
log "=== GCAP-GN Sauvegarde manuelle — $TIMESTAMP ==="

mkdir -p "$BACKUP_DIR"

if [[ -z "$SUPABASE_PROJECT_REF" ]]; then
  error "SUPABASE_PROJECT_REF non défini. Ajoutez-le dans .env.local ou l'environnement."
fi

if [[ -z "$SUPABASE_DB_PASSWORD" ]]; then
  error "SUPABASE_DB_PASSWORD non défini. Ajoutez-le dans .env.local ou l'environnement."
fi

if ! command -v pg_dump &>/dev/null; then
  error "pg_dump introuvable. Installez postgresql-client : apt-get install postgresql-client"
fi

# ─── Construction de l'URL de connexion ───────────────────────────────────────
DB_HOST="db.${SUPABASE_PROJECT_REF}.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_URL="postgresql://${DB_USER}:${SUPABASE_DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

log "Connexion à : $DB_HOST:$DB_PORT/$DB_NAME"

# ─── Sauvegarde ───────────────────────────────────────────────────────────────
log "Démarrage pg_dump → $BACKUP_FILE"

PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --compress=9 \
  --no-password \
  --verbose \
  --file="$BACKUP_FILE" \
  2>>"$LOG_FILE"

if [[ $? -ne 0 ]]; then
  error "pg_dump a échoué. Consultez : $LOG_FILE"
fi

# ─── Vérification de l'archive ────────────────────────────────────────────────
FILE_SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"
log "Archive créée : $BACKUP_FILE ($FILE_SIZE)"

# Générer le checksum SHA-256
CHECKSUM="$(sha256sum "$BACKUP_FILE" | awk '{print $1}')"
echo "$CHECKSUM  gcap-gn-backup-$TIMESTAMP.dump" > "$BACKUP_DIR/gcap-gn-backup-$TIMESTAMP.sha256"
log "SHA-256 : $CHECKSUM"
log "Fichier checksum : $BACKUP_DIR/gcap-gn-backup-$TIMESTAMP.sha256"

# ─── Nettoyage des anciennes sauvegardes (> 30 jours) ─────────────────────────
log "Nettoyage des sauvegardes de plus de 30 jours..."
find "$BACKUP_DIR" -name "gcap-gn-backup-*.dump" -mtime +30 -delete -print 2>>"$LOG_FILE" || true
find "$BACKUP_DIR" -name "gcap-gn-backup-*.sha256" -mtime +30 -delete -print 2>>"$LOG_FILE" || true
find "$BACKUP_DIR" -name "gcap-gn-backup-*.log" -mtime +30 -delete -print 2>>"$LOG_FILE" || true

# ─── Résumé ───────────────────────────────────────────────────────────────────
log ""
log "=== Sauvegarde terminée avec succès ==="
log "  Archive  : $BACKUP_FILE"
log "  SHA-256  : $CHECKSUM"
log "  Taille   : $FILE_SIZE"
log "  Log      : $LOG_FILE"
log ""
log "Pour restaurer :"
log "  PGPASSWORD=<mot-de-passe> pg_restore --host=$DB_HOST --port=$DB_PORT \\"
log "    --username=$DB_USER --dbname=postgres_restore --no-password \\"
log "    --clean --if-exists $BACKUP_FILE"
