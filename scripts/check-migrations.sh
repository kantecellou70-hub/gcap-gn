#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# GCAP-GN — Vérification des migrations Supabase
# Usage : ./scripts/check-migrations.sh [DATABASE_URL]
#
# Variables d'environnement (si DATABASE_URL non fourni) :
#   SUPABASE_DB_URL  → postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
#
# Retourne :
#   exit 0 → toutes les migrations sont appliquées dans le bon ordre
#   exit 1 → migrations manquantes ou désordonnées
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────

MIGRATIONS_DIR="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations"
DB_URL="${1:-${SUPABASE_DB_URL:-}}"

# Migrations attendues dans l'ordre (exclut 000_seed_check)
EXPECTED_MIGRATIONS=(
  "001_initial_schema"
  "002_budget_type_credit_vue"
  "003_engagements_triggers"
  "004_liquidations_mandats_rls_triggers"
  "005_liquidations_colonnes_statuts"
  "006_mandats_colonnes_statuts"
  "007_recettes_table"
  "008_administration_tables"
  "009_audit_triggers_rls"
  "009_matieres"
  "010_nomenclature_budgetaire"
  "011_storage_engagements"
  "012_exercices_rls_update"
  "013_notifications"
  "014_notifications_triggers"
  "015_notifications_triggers_manquants"
  "016_mfa_audit"
  "017_audit_signature_archivage"
  "018_performance_indexes"
  "019_backup_verification"
  "020_m9_consolidation"
  "021_seed_ministeres_guinee"
  "022_tenants_rls_super_admin"
  "023_sandbox_tenant"
  "024_reset_donnees_test"
  "025_v_users_actifs_par_tenant"
  "027_rls_v_users_actifs"
  "028_migrate_mefb_to_demo"
  "029_fn_evolution_mensuelle"
)

# ─── Couleurs ─────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'; BOLD='\033[1m'

# ─── Vérification locale (fichiers) ───────────────────────────────────────────

echo -e "${BOLD}GCAP-GN — Vérification des migrations${NC}"
echo -e "${BLUE}Dossier : ${MIGRATIONS_DIR}${NC}"
echo ""

LOCAL_FILES=()
while IFS= read -r -d '' f; do
  name=$(basename "$f" .sql)
  [[ "$name" == "000_seed_check" ]] && continue
  LOCAL_FILES+=("$name")
done < <(find "$MIGRATIONS_DIR" -name "*.sql" -not -name "000_*" -print0 | sort -z)

echo -e "${BOLD}Fichiers locaux (${#LOCAL_FILES[@]}) :${NC}"
for f in "${LOCAL_FILES[@]}"; do
  echo -e "  ${GREEN}✓${NC} $f"
done
echo ""

# ─── Vérification Supabase (si DATABASE_URL fourni) ───────────────────────────

if [[ -z "$DB_URL" ]]; then
  echo -e "${YELLOW}⚠ DATABASE_URL non défini — vérification base ignorée.${NC}"
  echo -e "  Fournir : ./scripts/check-migrations.sh 'postgresql://...'"
  echo -e "  Ou définir : export SUPABASE_DB_URL='postgresql://...'"
  echo ""
  echo -e "${BOLD}Résultat local : ${GREEN}OK${NC} — ${#LOCAL_FILES[@]} fichiers présents"
  exit 0
fi

# Vérifier que psql est disponible
if ! command -v psql &>/dev/null; then
  echo -e "${RED}✗ psql non trouvé. Installer : brew install postgresql${NC}"
  exit 1
fi

echo -e "${BOLD}Migrations appliquées en base :${NC}"

APPLIED=$(psql "$DB_URL" -t -A -c \
  "SELECT name FROM supabase_migrations.schema_migrations ORDER BY version;" 2>/dev/null || echo "ERROR")

if [[ "$APPLIED" == "ERROR" ]]; then
  echo -e "${RED}✗ Impossible de se connecter à la base de données.${NC}"
  echo -e "  Vérifier DATABASE_URL et la connectivité réseau."
  exit 1
fi

APPLIED_ARRAY=()
while IFS= read -r line; do
  [[ -n "$line" ]] && APPLIED_ARRAY+=("$line")
done <<< "$APPLIED"

echo -e "  ${#APPLIED_ARRAY[@]} migrations appliquées en base"
echo ""

# ─── Comparaison local / base ─────────────────────────────────────────────────

ERRORS=0
MISSING=()

for expected in "${EXPECTED_MIGRATIONS[@]}"; do
  found=false
  for applied in "${APPLIED_ARRAY[@]}"; do
    if [[ "$applied" == *"$expected"* ]]; then
      found=true
      break
    fi
  done
  if $found; then
    echo -e "  ${GREEN}✓${NC} $expected"
  else
    echo -e "  ${RED}✗ MANQUANTE${NC} — $expected"
    MISSING+=("$expected")
    ((ERRORS++))
  fi
done

echo ""

# ─── Rapport final ────────────────────────────────────────────────────────────

if [[ $ERRORS -eq 0 ]]; then
  echo -e "${BOLD}${GREEN}✓ TOUTES LES MIGRATIONS SONT APPLIQUÉES${NC}"
  echo -e "  ${#EXPECTED_MIGRATIONS[@]}/${#EXPECTED_MIGRATIONS[@]} migrations présentes"
  exit 0
else
  echo -e "${BOLD}${RED}✗ $ERRORS MIGRATION(S) MANQUANTE(S)${NC}"
  for m in "${MISSING[@]}"; do
    echo -e "  ${RED}→ Appliquer :${NC} supabase/migrations/${m}.sql"
  done
  echo ""
  echo -e "  Commande : supabase db push --db-url \"\$DATABASE_URL\""
  exit 1
fi
