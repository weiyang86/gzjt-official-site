#!/usr/bin/env bash

set -Eeuo pipefail

COMPOSE_FILE="${1:-docker-compose.prod.yml}"

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ -f "$COMPOSE_FILE" ]] || die "Compose file not found: $COMPOSE_FILE"

if ! grep -Eq '^[[:space:]]*-[[:space:]]*"?((0\.0\.0\.0|127\.0\.0\.1):)?3000:3000"?[[:space:]]*$' "$COMPOSE_FILE"; then
  die "Could not find a web port mapping like 3000:3000 in $COMPOSE_FILE. Please edit the web service ports manually."
fi

BACKUP_FILE="${COMPOSE_FILE}.bak.$(date '+%Y%m%d_%H%M%S')"
cp "$COMPOSE_FILE" "$BACKUP_FILE"

log "Backup created: $BACKUP_FILE"
log "Changing host web port from 3000 to 127.0.0.1:3001"

TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/gzjt-compose-port.XXXXXX")"
awk '
  /^[[:space:]]*-[[:space:]]*"?((0\.0\.0\.0|127\.0\.0\.1):)?3000:3000"?[[:space:]]*$/ {
    match($0, /^[[:space:]]*/);
    print substr($0, RSTART, RLENGTH) "- \"127.0.0.1:3001:3000\"";
    next;
  }
  { print }
' "$COMPOSE_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$COMPOSE_FILE"

log "Updated $COMPOSE_FILE"
log "Please verify the web service ports:"
grep -n -A6 -B2 'web:' "$COMPOSE_FILE" || true
