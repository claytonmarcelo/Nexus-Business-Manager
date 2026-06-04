#!/usr/bin/env bash
# backup.sh - Realiza dump do banco MySQL
# Uso: bash database/backup.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/database/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
ENV_FILE="$PROJECT_DIR/backend/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Erro: arquivo .env nao encontrado em $ENV_FILE"
  exit 1
fi

source "$ENV_FILE"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-nexus_business_manager}"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql"

echo "Iniciando backup do banco $DB_NAME..."
echo "Host: $DB_HOST:$DB_PORT"
echo "Destino: $BACKUP_FILE"

if [ -z "$DB_PASSWORD" ]; then
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --routines --triggers --single-transaction --quick \
    "$DB_NAME" > "$BACKUP_FILE"
else
  mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
    --routines --triggers --single-transaction --quick \
    "$DB_NAME" > "$BACKUP_FILE"
fi

gzip "$BACKUP_FILE"

echo "Backup concluido: ${BACKUP_FILE}.gz"
echo "Tamanho: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"
