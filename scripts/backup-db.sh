#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source ".env"
fi

if [[ -f ".env.production" ]]; then
  # shellcheck disable=SC1091
  source ".env.production"
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL ist nicht gesetzt."
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_PREFIX="${BACKUP_PREFIX:-vrema}"
BACKUP_KEEP_COUNT="${BACKUP_KEEP_COUNT:-7}"
mkdir -p "${BACKUP_DIR}"

TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
FILENAME="${BACKUP_PREFIX}_${TIMESTAMP}.dump"
TARGET="${BACKUP_DIR}/${FILENAME}"

echo "Starte Backup nach ${TARGET} ..."
pg_dump "${DATABASE_URL}" --format=custom --no-owner --file="${TARGET}"
echo "Backup erfolgreich erstellt: ${TARGET}"

if ! [[ "${BACKUP_KEEP_COUNT}" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_KEEP_COUNT muss eine ganze Zahl sein."
  exit 1
fi

# Rotation: nur die neuesten N Dumps behalten.
shopt -s nullglob
BACKUP_FILES=( "${BACKUP_DIR}/${BACKUP_PREFIX}"_*.dump )
shopt -u nullglob

if (( ${#BACKUP_FILES[@]} > BACKUP_KEEP_COUNT )); then
  IFS=$'\n' SORTED=( $(ls -1t "${BACKUP_DIR}/${BACKUP_PREFIX}"_*.dump) )
  unset IFS
  TO_DELETE=( "${SORTED[@]:${BACKUP_KEEP_COUNT}}" )

  for file in "${TO_DELETE[@]}"; do
    rm -f -- "${file}"
    echo "Altes Backup geloescht: ${file}"
  done
fi
