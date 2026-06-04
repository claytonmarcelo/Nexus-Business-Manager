#!/usr/bin/env bash
# restore.sh - Restaura dump do banco MySQL
# Uso: bash database/restore.sh <arquivo.sql ou arquivo.sql.gz>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: bash database/restore.sh <arquivo.sql[.gz]>"
  exit 1
fi

RESTORE_FILE="$1"

if [ ! -f "$RESTORE_FILE" ]; then
  echo "Erro: arquivo $RESTORE_FILE nao encontrado"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
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

echo "Restaurando banco $DB_NAME a partir de $RESTORE_FILE..."
echo "Host: $DB_HOST:$DB_PORT"
echo "ATENCAO: Isso substituira todos os dados do banco $DB_NAME!"

read -p "Continuar? (s/N) " CONFIRM
if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
  echo "Operacao cancelada."
  exit 0
fi

DECOMPRESS=""
if [[ "$RESTORE_FILE" == *.gz ]]; then
  DECOMPRESS="gunzip -c"
fi

if [ -z "$DB_PASSWORD" ]; then
  if [ -n "$DECOMPRESS" ]; then
    $DECOMPRESS "$RESTORE_FILE" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"
  else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" < "$RESTORE_FILE"
  fi
else
  if [ -n "$DECOMPRESS" ]; then
    $DECOMPRESS "$RESTORE_FILE" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME"
  else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$RESTORE_FILE"
  fi
fi

echo "Restauracao concluida com sucesso!"
